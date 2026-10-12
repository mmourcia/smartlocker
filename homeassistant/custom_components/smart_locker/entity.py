import random
from collections.abc import Callable
from datetime import datetime

from homeassistant.helpers.entity import Entity

from .const import (
    DOMAIN, STATE_FREE, STATE_OCCUPIED, STATE_WAITING, STATE_RETRIEVED, STATE_ERROR, LOCKER_STATES,
)

DELETED_RECIPIENT = "Destinataire supprimé"


class LockerEntity(Entity):
    """Casier. Les destinataires sont references par leur id (stable si renommes).

    Chaque changement est persiste (cf. lockers_store.py) : un redemarrage de Home Assistant
    ne perd ni les PIN ni les assignations.
    """

    _attr_should_poll = False

    def __init__(self, locker_id: int, data: dict | None = None,
                 on_change: Callable[[], None] | None = None) -> None:
        data = data or {}
        self._locker_id = locker_id
        self._state = data.get("state", STATE_FREE)
        if self._state not in LOCKER_STATES:
            self._state = STATE_FREE
        self._assigned: list[str] = list(data.get("assigned", []))
        self._pin_code: str | None = data.get("pin_code")
        self._retrieved_at: str | None = data.get("retrieved_at")
        self._notified_at: dict[str, str] = dict(data.get("notified_at", {}))
        self._on_change = on_change

    # ── Persistance ─────────────────────────────────────────────────────────

    def as_dict(self) -> dict:
        return {
            "state":        self._state,
            "assigned":     list(self._assigned),
            "pin_code":     self._pin_code,
            "retrieved_at": self._retrieved_at,
            "notified_at":  dict(self._notified_at),
        }

    def _changed(self) -> None:
        self.async_write_ha_state()
        if self._on_change:
            self._on_change()

    # ── Proprietes ──────────────────────────────────────────────────────────

    @property
    def locker_id(self) -> int:
        return self._locker_id

    @property
    def assigned_ids(self) -> list[str]:
        return list(self._assigned)

    @property
    def notified_ids(self) -> set[str]:
        return set(self._notified_at)

    @property
    def pin_code(self) -> str | None:
        return self._pin_code

    @property
    def unique_id(self) -> str:
        return f"{DOMAIN}_casier_{self._locker_id}"

    @property
    def name(self) -> str:
        return f"Casier {self._locker_id}"

    @property
    def state(self) -> str:
        return self._state

    @property
    def icon(self) -> str:
        icons = {
            "libre":        "mdi:lock-open-variant",
            "occupé":       "mdi:lock",
            "en_attente":   "mdi:account-clock",
            "récupéré":     "mdi:check-circle",
            "hors_service": "mdi:alert-circle",
        }
        return icons.get(self._state, "mdi:help")

    def _recipient_name(self, recipient_id: str) -> str:
        recipients = self.hass.data.get(DOMAIN, {}).get("recipients", []) if self.hass else []
        r = next((r for r in recipients if r["id"] == recipient_id), None)
        return f"{r['first_name']} {r['last_name']}" if r else DELETED_RECIPIENT

    @property
    def extra_state_attributes(self) -> dict:
        assigned = [
            {"id": rid, "name": self._recipient_name(rid), "notified_at": self._notified_at.get(rid)}
            for rid in self._assigned
        ]
        attrs = {
            "locker_id":           self._locker_id,
            "assigned_recipients": assigned,
            # Noms affiches (compatibilite automatisations existantes)
            "assigned_users":      [a["name"] for a in assigned],
        }
        if self._pin_code:
            attrs["pin_code"] = self._pin_code
        if self._retrieved_at:
            attrs["retrieved_at"] = self._retrieved_at
        if self._notified_at:
            attrs["notified_at"] = {a["name"]: a["notified_at"] for a in assigned if a["notified_at"]}
        return attrs

    # ── Transitions ─────────────────────────────────────────────────────────

    def assign(self, recipient_id: str) -> None:
        if recipient_id not in self._assigned:
            self._assigned.append(recipient_id)
        if not self._pin_code:
            self._pin_code = f"{random.randint(0, 999999):06d}"
        self._state = STATE_OCCUPIED
        self._changed()

    def unassign(self, recipient_id: str) -> None:
        self._assigned = [r for r in self._assigned if r != recipient_id]
        self._notified_at.pop(recipient_id, None)
        if not self._assigned:
            self._pin_code = None
            if self._state != STATE_ERROR:
                self._state = STATE_FREE
        self._changed()

    def mark_user_notified(self, recipient_id: str) -> None:
        self._notified_at[recipient_id] = datetime.now().strftime("%d/%m %H:%M")
        self._changed()

    def notify_sent(self) -> None:
        self._state = STATE_WAITING
        self._changed()

    def mark_retrieved(self) -> None:
        self._state = STATE_RETRIEVED
        self._retrieved_at = datetime.now().strftime("%d/%m/%Y %H:%M")
        self._changed()

    def reset(self) -> None:
        """Vide le casier. Un casier hors service le reste (cf. set_out_of_service)."""
        if self._state != STATE_ERROR:
            self._state = STATE_FREE
        self._assigned = []
        self._pin_code = None
        self._retrieved_at = None
        self._notified_at = {}
        self._changed()

    @property
    def out_of_service(self) -> bool:
        return self._state == STATE_ERROR

    def set_out_of_service(self, enabled: bool) -> None:
        """Hors service : le contenu (PIN, assignations) est conserve mais rien n'ouvre le casier.
        A la remise en service, l'etat est deduit du contenu."""
        if enabled:
            self._state = STATE_ERROR
        elif self._state == STATE_ERROR:
            if self._notified_at:
                self._state = STATE_WAITING
            elif self._assigned:
                self._state = STATE_OCCUPIED
            else:
                self._state = STATE_FREE
        self._changed()

    def refresh(self) -> None:
        """Destinataire renomme ou supprime : republie les noms affiches."""
        if self.hass:
            self.async_write_ha_state()
