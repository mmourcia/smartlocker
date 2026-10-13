import uuid
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import TemplateError
from homeassistant.helpers.storage import Store

from .const import (
    DOMAIN, STORE_KEY_RECIPIENTS, STORE_VERSION, DEFAULT_SETTINGS, TEMPLATE_KEYS, CHANNELS,
)
from .messages import validate_templates
from .notifier import migrate_recipient, split_services


async def async_setup_recipients(hass: HomeAssistant) -> None:
    store = Store(hass, STORE_VERSION, STORE_KEY_RECIPIENTS)
    data = await store.async_load() or {}
    hass.data[DOMAIN]["store"] = store
    hass.data[DOMAIN]["recipients"] = data.get("recipients", [])
    hass.data[DOMAIN]["settings"] = {**DEFAULT_SETTINGS, **data.get("settings", {})}
    # Ancien format (services notify uniquement) -> canaux email / sms
    if any([migrate_recipient(r) for r in hass.data[DOMAIN]["recipients"]]):
        await async_save(hass)

    websocket_api.async_register_command(hass, ws_list_recipients)
    websocket_api.async_register_command(hass, ws_add_recipient)
    websocket_api.async_register_command(hass, ws_update_recipient)
    websocket_api.async_register_command(hass, ws_delete_recipient)
    websocket_api.async_register_command(hass, ws_get_settings)
    websocket_api.async_register_command(hass, ws_set_settings)


def _refresh_lockers(hass: HomeAssistant) -> None:
    for locker in hass.data[DOMAIN]["lockers"].values():
        locker.refresh()


async def async_save(hass: HomeAssistant) -> None:
    await hass.data[DOMAIN]["store"].async_save({
        "recipients": hass.data[DOMAIN]["recipients"],
        "settings":   hass.data[DOMAIN]["settings"],
    })


# ── Destinataires ────────────────────────────────────────────────────────────

@websocket_api.websocket_command({
    vol.Required("type"): "smart_locker/recipients/list",
})
@websocket_api.async_response
async def ws_list_recipients(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    connection.send_result(msg["id"], hass.data[DOMAIN]["recipients"])


@websocket_api.websocket_command({
    vol.Required("type"): "smart_locker/recipients/add",
    vol.Required("first_name"): str,
    vol.Required("last_name"): str,
    vol.Optional("mobile",          default=""): str,
    vol.Optional("email",           default=""): str,
    vol.Optional("channels",        default=[]): [vol.In(CHANNELS)],
    vol.Optional("notify_services", default=[]): [str],
})
@websocket_api.async_response
async def ws_add_recipient(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    # Un service notify email / sms passe par l'API (ancien client) devient le canal correspondant
    channels, legacy, others = split_services(msg.get("notify_services", []))
    recipient = {
        "id":              str(uuid.uuid4()),
        "first_name":      msg["first_name"],
        "last_name":       msg["last_name"],
        "mobile":          msg.get("mobile", ""),
        "email":           msg.get("email", ""),
        "channels":        sorted(set(msg.get("channels", [])) | channels),
        "notify_services": others,
        "legacy_services": legacy,
        "badge_id":        "",
    }
    hass.data[DOMAIN]["recipients"].append(recipient)
    await async_save(hass)
    connection.send_result(msg["id"], recipient)


@websocket_api.websocket_command({
    vol.Required("type"): "smart_locker/recipients/update",
    vol.Required("recipient_id"): str,
    vol.Required("first_name"): str,
    vol.Required("last_name"): str,
    vol.Optional("mobile",          default=""): str,
    vol.Optional("email",           default=""): str,
    vol.Optional("channels",        default=[]): [vol.In(CHANNELS)],
    vol.Optional("notify_services", default=[]): [str],
})
@websocket_api.async_response
async def ws_update_recipient(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    recipients = hass.data[DOMAIN]["recipients"]
    channels, legacy, others = split_services(msg.get("notify_services", []))
    for i, r in enumerate(recipients):
        if r["id"] == msg["recipient_id"]:
            recipients[i] = {
                "id":              msg["recipient_id"],
                "first_name":      msg["first_name"],
                "last_name":       msg["last_name"],
                "mobile":          msg.get("mobile", ""),
                "email":           msg.get("email", ""),
                "channels":        sorted(set(msg.get("channels", [])) | channels),
                "notify_services": others,
                # Anciens services YAML (transition), non modifiables depuis la carte
                "legacy_services": sorted(set(r.get("legacy_services", [])) | set(legacy)),
                "badge_id":        r.get("badge_id", ""),  # gere par smart_locker/badges/*
            }
            await async_save(hass)
            _refresh_lockers(hass)
            connection.send_result(msg["id"], recipients[i])
            return
    connection.send_error(msg["id"], "not_found", "Destinataire introuvable")


@websocket_api.websocket_command({
    vol.Required("type"): "smart_locker/recipients/delete",
    vol.Required("recipient_id"): str,
})
@websocket_api.async_response
async def ws_delete_recipient(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    hass.data[DOMAIN]["recipients"] = [
        r for r in hass.data[DOMAIN]["recipients"] if r["id"] != msg["recipient_id"]
    ]
    await async_save(hass)
    _refresh_lockers(hass)
    connection.send_result(msg["id"], {"success": True})


# ── Paramètres ───────────────────────────────────────────────────────────────

@websocket_api.websocket_command({
    vol.Required("type"): "smart_locker/settings/get",
})
@websocket_api.async_response
async def ws_get_settings(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    connection.send_result(msg["id"], public_settings(hass))


def public_settings(hass: HomeAssistant) -> dict:
    """Parametres sans la configuration d'envoi (secrets) : cf. smart_locker/channels/get."""
    return {k: v for k, v in hass.data[DOMAIN]["settings"].items() if k not in CHANNELS}


@websocket_api.websocket_command({
    vol.Required("type"): "smart_locker/settings/set",
    vol.Optional("notification_title"): vol.All(str, vol.Length(min=1)),
    vol.Optional("msg_text"):           vol.All(str, vol.Length(min=1)),
    vol.Optional("msg_email_html"):     vol.All(str, vol.Length(min=1)),
    vol.Optional("relay_device_id"):    str,
    vol.Optional("keypad_device_id"):   str,
    vol.Optional("led_entry_id"):       str,
    vol.Optional("led_brightness"):     vol.All(vol.Coerce(int), vol.Range(min=1, max=255)),
    vol.Optional("led_timeout"):        vol.All(vol.Coerce(int), vol.Range(min=5, max=3600)),
    vol.Optional("door_alert_delay"):   vol.All(vol.Coerce(int), vol.Range(min=5, max=3600)),
})
@websocket_api.async_response
async def ws_set_settings(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    settings = hass.data[DOMAIN]["settings"]
    try:
        validate_templates(hass, {k: msg.get(k, settings[k]) for k in TEMPLATE_KEYS})
    except TemplateError as err:
        connection.send_error(msg["id"], "invalid_template", str(err))
        return
    for key in DEFAULT_SETTINGS:
        if key in msg:
            settings[key] = msg[key]
    await async_save(hass)
    hass.data[DOMAIN]["hardware"].resolve()
    hass.data[DOMAIN]["leds"].settings_changed()
    connection.send_result(msg["id"], public_settings(hass))
