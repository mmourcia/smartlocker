"""Pilotage des rubans LED (controleur WLED) selon l'etat des casiers.

L'eclairage ne s'allume que sur activite devant le meuble (touche digicode, badge,
ouverture de porte) et s'eteint apres `led_timeout` secondes sans activite. Une alerte
porte ouverte reste visible meme hors activite.

Chaque rendu calcule l'etat complet des 8 segments et l'envoie en une seule requete a
l'API JSON de WLED (`POST /json/state`) : changement atomique, pas de scintillement.
"""
import asyncio
import logging
import time

import aiohttp
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.const import CONF_HOST
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_call_later

from .const import (
    DOMAIN,
    LOCKER_IDS,
    TECHNICAL_LOCKERS,
    LED_SEGMENTS,
    LED_ACCESS_SECONDS,
    LED_ERROR_SECONDS,
    LED_BLINK_SPEED,
    FX_SOLID,
    FX_BLINK,
    COLOR_GREEN,
    COLOR_BLUE,
    COLOR_RED,
    COLOR_ORANGE,
    STATE_FREE,
    STATE_OCCUPIED,
    STATE_WAITING,
    STATE_RETRIEVED,
    STATE_ERROR,
    WS_LEDS_DEVICES,
    WS_LEDS_TEST,
)

_LOGGER = logging.getLogger(__name__)

# Couleur fixe affichee pour chaque etat metier
_STATE_COLORS = {
    STATE_FREE:      COLOR_GREEN,
    STATE_RETRIEVED: COLOR_GREEN,
    STATE_OCCUPIED:  COLOR_BLUE,
    STATE_WAITING:   COLOR_BLUE,
    STATE_ERROR:     COLOR_RED,
}

_OFF = None


class LedController:

    def __init__(self, hass: HomeAssistant, lockers: dict) -> None:
        self.hass = hass
        self._lockers = lockers
        self._session_until = 0.0
        # Scene temporaire prioritaire : ("access", {casiers}, fin) ou ("error", None, fin)
        self._scene: tuple[str, frozenset[int] | None, float] | None = None
        self._door_alerts: set[int] = set()
        self._door_timers: dict[int, CALLBACK_TYPE] = {}
        self._lock = asyncio.Lock()
        self._desired: dict | None = None
        self._sent: dict | None = None

    # ── Parametres ──────────────────────────────────────────────────────────

    @property
    def _settings(self) -> dict:
        return self.hass.data[DOMAIN]["settings"]

    def _host(self) -> str | None:
        entry_id = self._settings.get("led_entry_id")
        if not entry_id:
            return None
        entry = self.hass.config_entries.async_get_entry(entry_id)
        if entry is None or entry.domain != "wled":
            _LOGGER.warning("Controleur WLED %s introuvable - choisir un autre appareil", entry_id)
            return None
        return entry.data.get(CONF_HOST)

    # ── Evenements ──────────────────────────────────────────────────────────

    @callback
    def activity(self) -> None:
        """Quelqu'un est devant le meuble : allumer / prolonger l'eclairage."""
        timeout = self._settings["led_timeout"]
        self._session_until = time.monotonic() + timeout
        self._render_later(timeout)
        self.render()

    @callback
    def show_access(self, *locker_ids: int) -> None:
        """Code / badge correct : seuls les casiers qui s'ouvrent clignotent en vert."""
        self._scene = ("access", frozenset(locker_ids), time.monotonic() + LED_ACCESS_SECONDS)
        self._render_later(LED_ACCESS_SECONDS)
        self.activity()

    @callback
    def show_error(self) -> None:
        """Code incorrect, saisie abandonnee ou badge inconnu : tous les casiers en rouge."""
        self._scene = ("error", None, time.monotonic() + LED_ERROR_SECONDS)
        self._render_later(LED_ERROR_SECONDS)
        self.activity()

    @callback
    def door_changed(self, locker_id: int, is_open: bool) -> None:
        if cancel := self._door_timers.pop(locker_id, None):
            cancel()
        if is_open:
            @callback
            def _alert(_now) -> None:
                self._door_timers.pop(locker_id, None)
                self._door_alerts.add(locker_id)
                self.render()

            self._door_timers[locker_id] = async_call_later(
                self.hass, self._settings["door_alert_delay"], _alert
            )
        else:
            self._door_alerts.discard(locker_id)
        # Ouvrir ou fermer une porte = quelqu'un est devant le meuble
        self.activity()

    @callback
    def settings_changed(self) -> None:
        self._sent = None
        self.render()

    # ── Rendu ───────────────────────────────────────────────────────────────

    @callback
    def _render_later(self, delay: float) -> None:
        @callback
        def _tick(_now) -> None:
            self.render()

        async_call_later(self.hass, delay + 0.1, _tick)

    def _compute(self) -> dict:
        now = time.monotonic()
        if self._scene and self._scene[2] <= now:
            self._scene = None
        session = now < self._session_until

        # spec par casier : (couleur, effet) ou _OFF
        specs: dict[int, tuple | None] = {}
        if self._scene and self._scene[0] == "access":
            for lid in LOCKER_IDS:
                specs[lid] = (COLOR_GREEN, FX_BLINK) if lid in self._scene[1] else _OFF
        elif self._scene and self._scene[0] == "error":
            for lid in LOCKER_IDS:
                specs[lid] = (COLOR_RED, FX_BLINK)
        elif session:
            for lid in LOCKER_IDS:
                if lid in self._door_alerts:
                    specs[lid] = (COLOR_ORANGE, FX_BLINK)
                else:
                    color = _STATE_COLORS.get(self._lockers[lid].state)
                    specs[lid] = (color, FX_SOLID) if color else _OFF
        elif self._door_alerts:
            for lid in LOCKER_IDS:
                specs[lid] = (COLOR_ORANGE, FX_BLINK) if lid in self._door_alerts else _OFF

        if not any(specs.values()):
            return {"on": False}

        segs = []
        for lid, seg_id in LED_SEGMENTS.items():
            spec = None if lid in TECHNICAL_LOCKERS else specs.get(lid)
            if spec is None:
                segs.append({"id": seg_id, "on": False})
            else:
                color, fx = spec
                segs.append({
                    "id": seg_id, "on": True, "bri": 255,
                    "col": [color, [0, 0, 0], [0, 0, 0]],
                    "fx": fx, "sx": LED_BLINK_SPEED,
                })
        return {
            "on": True,
            "bri": self._settings["led_brightness"],
            "transition": 0,
            "seg": segs,
        }

    @callback
    def render(self) -> None:
        self._desired = self._compute()
        self.hass.async_create_task(self._async_push())

    async def _async_push(self) -> None:
        # Le verrou est FIFO : la derniere tache envoie toujours l'etat le plus recent.
        async with self._lock:
            payload = self._desired
            if payload is None or payload == self._sent:
                return
            host = self._host()
            if not host:
                return
            try:
                session = async_get_clientsession(self.hass)
                async with session.post(
                    f"http://{host}/json/state",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    resp.raise_for_status()
                self._sent = payload
            except (aiohttp.ClientError, asyncio.TimeoutError) as err:
                self._sent = None
                _LOGGER.warning("Envoi WLED %s echoue : %s", host, err)


# ── API WebSocket (carte Eclairage) ─────────────────────────────────────────

def async_setup_leds_ws(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_list_devices)
    websocket_api.async_register_command(hass, ws_test)


@websocket_api.websocket_command({
    vol.Required("type"): WS_LEDS_DEVICES,
})
@callback
def ws_list_devices(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Controleurs WLED enregistres dans Home Assistant."""
    connection.send_result(msg["id"], [
        {"entry_id": e.entry_id, "title": e.title, "host": e.data.get(CONF_HOST, "")}
        for e in hass.config_entries.async_entries("wled")
    ])


@websocket_api.websocket_command({
    vol.Required("type"): WS_LEDS_TEST,
})
@callback
def ws_test(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Simule une activite devant le meuble (allume l'eclairage)."""
    hass.data[DOMAIN]["leds"].activity()
    connection.send_result(msg["id"], {"success": True})
