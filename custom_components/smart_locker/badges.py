"""Badges RFID : attribution aux destinataires et enrolement depuis le lecteur du meuble.

Enrolement : la carte Destinataires ouvre une souscription WebSocket pour un destinataire.
Le prochain badge lu par le digicode est capture (il n'ouvre aucun casier) et attribue a ce
destinataire. S'il appartient deja a quelqu'un d'autre, la carte demande confirmation puis
appelle `smart_locker/badges/assign` avec `force`.
"""
import logging
from collections.abc import Callable

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.event import async_call_later

from .const import DOMAIN, BADGE_ENROLL_SECONDS, WS_BADGES_ENROLL, WS_BADGES_ASSIGN

_LOGGER = logging.getLogger(__name__)


def full_name(recipient: dict) -> str:
    return f"{recipient['first_name']} {recipient['last_name']}"


def find_by_badge(hass: HomeAssistant, badge_id: str) -> dict | None:
    return next(
        (r for r in hass.data[DOMAIN]["recipients"] if badge_id and r.get("badge_id") == badge_id),
        None,
    )


async def async_assign_badge(
    hass: HomeAssistant, recipient_id: str, badge_id: str, force: bool = False
) -> dict | None:
    """Attribue (ou retire si vide) un badge. Retourne le proprietaire en conflit, sinon None."""
    from .recipients import async_save  # import local : evite un cycle

    recipients = hass.data[DOMAIN]["recipients"]
    owner = find_by_badge(hass, badge_id)
    if owner and owner["id"] != recipient_id:
        if not force:
            return owner
        owner["badge_id"] = ""
        _LOGGER.info("Badge %s retire a %s", badge_id, full_name(owner))
    for r in recipients:
        if r["id"] == recipient_id:
            r["badge_id"] = badge_id
            _LOGGER.info("Badge %s attribue a %s", badge_id or "(aucun)", full_name(r))
    await async_save(hass)
    return None


class BadgeEnrollment:
    """Un seul enrolement a la fois : le dernier demande remplace le precedent."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._recipient_id: str | None = None
        self._notify: Callable[[dict], None] | None = None
        self._cancel_timer: CALLBACK_TYPE | None = None

    @property
    def active(self) -> bool:
        return self._recipient_id is not None

    @callback
    def start(self, recipient_id: str, notify: Callable[[dict], None]) -> CALLBACK_TYPE:
        if self._notify:
            self._notify({"status": "cancelled"})
        self._stop()
        self._recipient_id = recipient_id
        self._notify = notify

        @callback
        def _timeout(_now) -> None:
            self._cancel_timer = None
            if self._notify:
                self._notify({"status": "timeout"})
            self._stop()

        self._cancel_timer = async_call_later(self.hass, BADGE_ENROLL_SECONDS, _timeout)
        notify({"status": "waiting", "timeout": BADGE_ENROLL_SECONDS})

        @callback
        def _unsubscribe() -> None:
            if self._notify is notify:
                self._stop()

        return _unsubscribe

    @callback
    def _stop(self) -> None:
        if self._cancel_timer:
            self._cancel_timer()
        self._recipient_id = self._notify = self._cancel_timer = None

    @callback
    def capture(self, badge_id: str) -> bool:
        """Badge lu : True s'il a ete capture par un enrolement en cours."""
        if not self.active:
            return False
        recipient_id, notify = self._recipient_id, self._notify
        self._stop()
        self.hass.async_create_task(self._async_enroll(recipient_id, notify, badge_id))
        return True

    async def _async_enroll(self, recipient_id: str, notify: Callable, badge_id: str) -> None:
        owner = await async_assign_badge(self.hass, recipient_id, badge_id)
        if owner:
            notify({
                "status": "conflict", "badge_id": badge_id,
                "owner_id": owner["id"], "owner": full_name(owner),
            })
        else:
            notify({"status": "enrolled", "badge_id": badge_id})


# ── API WebSocket (carte Destinataires) ─────────────────────────────────────

def async_setup_badges_ws(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_enroll)
    websocket_api.async_register_command(hass, ws_assign)


@websocket_api.websocket_command({
    vol.Required("type"): WS_BADGES_ENROLL,
    vol.Required("recipient_id"): str,
})
@callback
def ws_enroll(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Souscription : attend le prochain badge lu et l'attribue au destinataire."""
    if not any(r["id"] == msg["recipient_id"] for r in hass.data[DOMAIN]["recipients"]):
        connection.send_error(msg["id"], "not_found", "Destinataire introuvable")
        return

    @callback
    def notify(payload: dict) -> None:
        connection.send_message(websocket_api.event_message(msg["id"], payload))

    connection.send_result(msg["id"])
    connection.subscriptions[msg["id"]] = hass.data[DOMAIN]["badges"].start(
        msg["recipient_id"], notify
    )


@websocket_api.websocket_command({
    vol.Required("type"): WS_BADGES_ASSIGN,
    vol.Required("recipient_id"): str,
    vol.Required("badge_id"): str,
    vol.Optional("force", default=False): bool,
})
@websocket_api.async_response
async def ws_assign(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Attribue un badge (force=True pour le retirer a son proprietaire actuel), ou le retire si vide."""
    if not any(r["id"] == msg["recipient_id"] for r in hass.data[DOMAIN]["recipients"]):
        connection.send_error(msg["id"], "not_found", "Destinataire introuvable")
        return
    owner = await async_assign_badge(hass, msg["recipient_id"], msg["badge_id"].strip(), msg["force"])
    if owner:
        connection.send_error(msg["id"], "conflict", f"Badge déjà attribué à {full_name(owner)}")
        return
    connection.send_result(msg["id"], hass.data[DOMAIN]["recipients"])
