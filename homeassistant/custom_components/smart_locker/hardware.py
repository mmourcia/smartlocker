"""Liaison avec le materiel ESPHome : carte relais (serrures, portes) et digicode.

Carte relais : les entites « Ouvrir casier N » et « Porte casier N » sont retrouvees sur
l'appareil choisi d'apres leur nom d'origine ESPHome (original_name), qui ne depend ni de
l'entity_id genere par HA (suffixe _2…) ni d'un renommage dans HA. Ordre de resolution :
  1. appareil choisi dans la carte Materiel ;
  2. a defaut, detection automatique (l'appareil ESPHome qui porte le plus de ces entites) ;
  3. a defaut, anciens entity_id fixes (button.smart_locker_relais_ouvrir_casier_N…).

Digicode : si un appareil est choisi, seuls ses evenements esphome.* sont pris en compte.
"""
import logging
import re
import unicodedata
from collections.abc import Callable

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import CALLBACK_TYPE, Event, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.event import async_call_later

from .const import (
    DOMAIN,
    LOCKER_IDS,
    ESPHOME_BUTTON_OPEN,
    ESPHOME_DOOR_SENSOR,
    WS_HARDWARE_STATUS,
    WS_KEYPAD_TEST,
)

KEYPAD_TEST_SECONDS = 120

_LOGGER = logging.getLogger(__name__)

_BUTTON_RE = re.compile(r"ouvrir[ _]casier[ _](\d+)$")
_DOOR_RE = re.compile(r"porte[ _]casier[ _](\d+)$")


def _norm(text: str | None) -> str:
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    return text.lower().strip()


def _locker_of(entry: er.RegistryEntry, domain: str, pattern: re.Pattern) -> int | None:
    """Numero de casier d'une entite, d'apres son nom d'origine (ou son unique_id)."""
    if entry.domain != domain:
        return None
    for candidate in (_norm(entry.original_name), _norm(entry.unique_id)):
        if m := pattern.search(candidate):
            return int(m.group(1))
    return None


class Hardware:

    def __init__(self, hass: HomeAssistant, on_change: Callable[[], None]) -> None:
        self.hass = hass
        self._on_change = on_change
        self.buttons: dict[int, str] = {}
        self.doors: dict[int, str] = {}
        self.relay_device_id: str | None = None
        self.relay_source = "none"   # selected | auto | legacy | none

    @property
    def _settings(self) -> dict:
        return self.hass.data[DOMAIN]["settings"]

    # ── Resolution ──────────────────────────────────────────────────────────

    def _scan_device(self, device_id: str) -> tuple[dict[int, str], dict[int, str]]:
        buttons, doors = {}, {}
        for entry in er.async_entries_for_device(er.async_get(self.hass), device_id):
            if entry.disabled_by:
                continue
            if (lid := _locker_of(entry, "button", _BUTTON_RE)) in LOCKER_IDS:
                buttons[lid] = entry.entity_id
            elif (lid := _locker_of(entry, "binary_sensor", _DOOR_RE)) in LOCKER_IDS:
                doors[lid] = entry.entity_id
        return buttons, doors

    def _auto_detect(self) -> str | None:
        best, best_count = None, 0
        for device in esphome_devices(self.hass):
            buttons, doors = self._scan_device(device.id)
            if (count := len(buttons) + len(doors)) > best_count:
                best, best_count = device.id, count
        return best

    @callback
    def resolve(self) -> None:
        """(Re)calcule les entites de chaque casier ; previent si la liaison change."""
        before = (dict(self.buttons), dict(self.doors))
        selected = self._settings.get("relay_device_id") or None
        device_id, source = (selected, "selected") if selected else (self._auto_detect(), "auto")
        buttons, doors = self._scan_device(device_id) if device_id else ({}, {})

        # Anciens entity_id fixes pour les casiers non trouves (installations existantes)
        legacy = False
        if source != "selected":
            for lid in LOCKER_IDS:
                if lid not in buttons and self._exists(ESPHOME_BUTTON_OPEN.format(lid)):
                    buttons[lid], legacy = ESPHOME_BUTTON_OPEN.format(lid), True
                if lid not in doors and self._exists(ESPHOME_DOOR_SENSOR.format(lid)):
                    doors[lid], legacy = ESPHOME_DOOR_SENSOR.format(lid), True

        self.buttons, self.doors, self.relay_device_id = buttons, doors, device_id
        self.relay_source = (source if device_id else ("legacy" if legacy else "none"))
        if (buttons, doors) != before:
            missing = [lid for lid in LOCKER_IDS if lid not in buttons or lid not in doors]
            if missing:
                _LOGGER.warning(
                    "Carte relais : entites introuvables pour le(s) casier(s) %s - "
                    "verifier la carte Materiel", missing,
                )
            self._on_change()

    def _exists(self, entity_id: str) -> bool:
        return bool(self.hass.states.get(entity_id) or er.async_get(self.hass).async_get(entity_id))

    def button(self, locker_id: int) -> str | None:
        return self.buttons.get(locker_id)

    def door(self, locker_id: int) -> str | None:
        return self.doors.get(locker_id)

    # ── Digicode ────────────────────────────────────────────────────────────

    @callback
    def accepts_keypad(self, event: Event) -> bool:
        """Evenement venant du digicode choisi (tous les appareils si aucun choisi)."""
        keypad = self._settings.get("keypad_device_id")
        return not keypad or event.data.get("device_id") == keypad

    # ── Etat pour la carte Materiel ─────────────────────────────────────────

    def status(self) -> dict:
        def state(entity_id):
            st = self.hass.states.get(entity_id) if entity_id else None
            return st.state if st else None

        keypad = self._settings.get("keypad_device_id") or None
        return {
            "relay": {
                "device_id": self.relay_device_id,
                "source": self.relay_source,
                "online": self._online(list(self.buttons.values()) + list(self.doors.values())),
                "lockers": {
                    str(lid): {
                        "button": self.button(lid),
                        "door": self.door(lid),
                        "door_state": state(self.door(lid)),
                    }
                    for lid in LOCKER_IDS
                },
            },
            "keypad": {
                "device_id": keypad,
                "online": self._online(device_entities(self.hass, keypad)) if keypad else None,
            },
        }

    def _online(self, entity_ids: list[str]) -> bool | None:
        """En ligne si au moins une entite est disponible (ESPHome hors ligne = tout unavailable)."""
        states = [self.hass.states.get(e) for e in entity_ids]
        states = [st for st in states if st is not None]
        if not states:
            return None
        return any(st.state != STATE_UNAVAILABLE for st in states)


class KeypadTest:
    """Mode test du digicode : les evenements sont rapportes a la carte Materiel au lieu
    d'etre traites (rien ne s'ouvre, l'eclairage ne reagit pas)."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._notify: Callable[[dict], None] | None = None
        self._cancel_timer: CALLBACK_TYPE | None = None

    @property
    def active(self) -> bool:
        return self._notify is not None

    @callback
    def start(self, notify: Callable[[dict], None]) -> CALLBACK_TYPE:
        self._stop({"type": "end", "reason": "replaced"})
        self._notify = notify

        @callback
        def _timeout(_now) -> None:
            self._cancel_timer = None
            self._stop({"type": "end", "reason": "timeout"})

        self._cancel_timer = async_call_later(self.hass, KEYPAD_TEST_SECONDS, _timeout)
        notify({"type": "start", "timeout": KEYPAD_TEST_SECONDS})

        @callback
        def _unsubscribe() -> None:
            if self._notify is notify:
                self._stop(None)

        return _unsubscribe

    @callback
    def _stop(self, final: dict | None) -> None:
        if self._cancel_timer:
            self._cancel_timer()
        notify, self._notify, self._cancel_timer = self._notify, None, None
        if notify and final:
            notify(final)

    @callback
    def report(self, payload: dict) -> None:
        if self._notify:
            self._notify(payload)


def device_entities(hass: HomeAssistant, device_id: str | None) -> list[str]:
    if not device_id:
        return []
    return [e.entity_id for e in er.async_entries_for_device(er.async_get(hass), device_id)]


def device_name(hass: HomeAssistant, device_id: str | None) -> str | None:
    device = dr.async_get(hass).async_get(device_id) if device_id else None
    return (device.name_by_user or device.name) if device else None


def esphome_devices(hass: HomeAssistant) -> list[dr.DeviceEntry]:
    esphome_entries = {e.entry_id for e in hass.config_entries.async_entries("esphome")}
    return [
        d for d in dr.async_get(hass).devices.values()
        if d.config_entries & esphome_entries and not d.disabled_by
    ]


# ── API WebSocket (carte Materiel) ──────────────────────────────────────────

def async_setup_hardware_ws(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_status)
    websocket_api.async_register_command(hass, ws_keypad_test)


@websocket_api.websocket_command({vol.Required("type"): WS_HARDWARE_STATUS})
@callback
def ws_status(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Appareils disponibles et etat de la liaison casier par casier."""
    hardware: Hardware = hass.data[DOMAIN]["hardware"]
    connection.send_result(msg["id"], {
        "esphome": sorted(
            ({"device_id": d.id, "name": d.name_by_user or d.name or d.id, "model": d.model or ""}
             for d in esphome_devices(hass)),
            key=lambda d: d["name"].lower(),
        ),
        "wled": [
            {"entry_id": e.entry_id, "title": e.title, "host": e.data.get("host", "")}
            for e in hass.config_entries.async_entries("wled")
        ],
        **hardware.status(),
        "leds": hass.data[DOMAIN]["leds"].status(),
    })


@websocket_api.websocket_command({vol.Required("type"): WS_KEYPAD_TEST})
@callback
def ws_keypad_test(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Souscription : rapporte touches, codes, badges et abandons du digicode."""
    @callback
    def notify(payload: dict) -> None:
        connection.send_message(websocket_api.event_message(msg["id"], payload))

    connection.send_result(msg["id"])
    connection.subscriptions[msg["id"]] = hass.data[DOMAIN]["keypad_test"].start(notify)
