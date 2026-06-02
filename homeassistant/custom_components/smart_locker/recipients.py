import uuid
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORE_KEY_RECIPIENTS, STORE_VERSION, DEFAULT_NOTIFICATION_TITLE

_DEFAULT_SETTINGS = {
    "notification_title": DEFAULT_NOTIFICATION_TITLE,
}


async def async_setup_recipients(hass: HomeAssistant) -> None:
    store = Store(hass, STORE_VERSION, STORE_KEY_RECIPIENTS)
    data = await store.async_load() or {}
    hass.data[DOMAIN]["store"] = store
    hass.data[DOMAIN]["recipients"] = data.get("recipients", [])
    hass.data[DOMAIN]["settings"] = {**_DEFAULT_SETTINGS, **data.get("settings", {})}

    websocket_api.async_register_command(hass, ws_list_recipients)
    websocket_api.async_register_command(hass, ws_add_recipient)
    websocket_api.async_register_command(hass, ws_update_recipient)
    websocket_api.async_register_command(hass, ws_delete_recipient)
    websocket_api.async_register_command(hass, ws_get_settings)
    websocket_api.async_register_command(hass, ws_set_settings)


async def _save(hass: HomeAssistant) -> None:
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
    vol.Optional("mobile", default=""): str,
    vol.Required("email"): str,
})
@websocket_api.async_response
async def ws_add_recipient(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    recipient = {
        "id":         str(uuid.uuid4()),
        "first_name": msg["first_name"],
        "last_name":  msg["last_name"],
        "mobile":     msg.get("mobile", ""),
        "email":      msg["email"],
    }
    hass.data[DOMAIN]["recipients"].append(recipient)
    await _save(hass)
    connection.send_result(msg["id"], recipient)


@websocket_api.websocket_command({
    vol.Required("type"): "smart_locker/recipients/update",
    vol.Required("id"): str,
    vol.Required("first_name"): str,
    vol.Required("last_name"): str,
    vol.Optional("mobile", default=""): str,
    vol.Required("email"): str,
})
@websocket_api.async_response
async def ws_update_recipient(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    recipients = hass.data[DOMAIN]["recipients"]
    for i, r in enumerate(recipients):
        if r["id"] == msg["id"]:
            recipients[i] = {
                "id":         msg["id"],
                "first_name": msg["first_name"],
                "last_name":  msg["last_name"],
                "mobile":     msg.get("mobile", ""),
                "email":      msg["email"],
            }
            await _save(hass)
            connection.send_result(msg["id"], recipients[i])
            return
    connection.send_error(msg["id"], "not_found", "Destinataire introuvable")


@websocket_api.websocket_command({
    vol.Required("type"): "smart_locker/recipients/delete",
    vol.Required("id"): str,
})
@websocket_api.async_response
async def ws_delete_recipient(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    hass.data[DOMAIN]["recipients"] = [
        r for r in hass.data[DOMAIN]["recipients"] if r["id"] != msg["id"]
    ]
    await _save(hass)
    connection.send_result(msg["id"], {"success": True})


# ── Paramètres ───────────────────────────────────────────────────────────────

@websocket_api.websocket_command({
    vol.Required("type"): "smart_locker/settings/get",
})
@websocket_api.async_response
async def ws_get_settings(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    connection.send_result(msg["id"], hass.data[DOMAIN]["settings"])


@websocket_api.websocket_command({
    vol.Required("type"): "smart_locker/settings/set",
    vol.Required("notification_title"): str,
})
@websocket_api.async_response
async def ws_set_settings(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    hass.data[DOMAIN]["settings"]["notification_title"] = msg["notification_title"]
    await _save(hass)
    connection.send_result(msg["id"], hass.data[DOMAIN]["settings"])
