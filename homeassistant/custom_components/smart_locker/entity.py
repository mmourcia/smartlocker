import random
from datetime import datetime
from homeassistant.helpers.entity import Entity
from .const import DOMAIN, STATE_FREE, STATE_OCCUPIED, STATE_WAITING, STATE_RETRIEVED


class LockerEntity(Entity):

    def __init__(self, locker_id: int) -> None:
        self._locker_id = locker_id
        self._state = STATE_FREE
        self._assigned_users: list[str] = []
        self._pin_code: str | None = None
        self._retrieved_at: str | None = None
        self._notified_at: dict[str, str] = {}

    @property
    def locker_id(self) -> int:
        return self._locker_id

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

    @property
    def extra_state_attributes(self) -> dict:
        attrs = {
            "locker_id":      self._locker_id,
            "assigned_users": list(self._assigned_users),
        }
        if self._pin_code:
            attrs["pin_code"] = self._pin_code
        if self._retrieved_at:
            attrs["retrieved_at"] = self._retrieved_at
        if self._notified_at:
            attrs["notified_at"] = dict(self._notified_at)
        return attrs

    def assign(self, user: str) -> None:
        if user not in self._assigned_users:
            self._assigned_users.append(user)
        if not self._pin_code:
            self._pin_code = f"{random.randint(0, 999999):06d}"
        self._state = STATE_OCCUPIED
        self.async_write_ha_state()

    def unassign(self, user: str) -> None:
        self._assigned_users = [u for u in self._assigned_users if u != user]
        self._notified_at.pop(user, None)
        if not self._assigned_users:
            self._state = STATE_FREE
        self.async_write_ha_state()

    def mark_user_notified(self, user: str) -> None:
        self._notified_at[user] = datetime.now().strftime("%d/%m %H:%M")
        self.async_write_ha_state()

    def notify_sent(self) -> None:
        self._state = STATE_WAITING
        self.async_write_ha_state()

    def mark_retrieved(self) -> None:
        self._state = STATE_RETRIEVED
        self._retrieved_at = datetime.now().strftime("%d/%m/%Y %H:%M")
        self.async_write_ha_state()

    def reset(self) -> None:
        self._state = STATE_FREE
        self._assigned_users = []
        self._pin_code = None
        self._retrieved_at = None
        self._notified_at = {}
        self.async_write_ha_state()
