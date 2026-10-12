"""Templates des messages envoyes aux destinataires (titre, texte SMS/push, HTML email).

Les templates sont du Jinja Home Assistant, edites depuis la carte Messages et stockes
dans les parametres. Variables disponibles : voir TEMPLATE_VARIABLES.
"""
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import TemplateError
from homeassistant.helpers.template import Template

from .const import DOMAIN, DEFAULT_SETTINGS, TEMPLATE_KEYS, WS_MESSAGES_PREVIEW

# Description affichee dans la carte Messages
TEMPLATE_VARIABLES = {
    "first_name":    "Prénom du destinataire",
    "last_name":     "Nom du destinataire",
    "full_name":     "Prénom Nom",
    "locker":        "Numéro du casier",
    "pin":           "Code PIN brut (123456)",
    "pin_formatted": "Code PIN formaté (123-456)",
    "has_badge":     "true si le destinataire a un badge",
}

_SAMPLE = {
    "first_name": "Jean", "last_name": "Dupont", "full_name": "Jean Dupont",
    "locker": 4, "pin": "123456", "pin_formatted": "123-456", "has_badge": True,
}


def message_variables(recipient: dict | None, user: str, locker_id: int, pin: str) -> dict:
    recipient = recipient or {}
    return {
        "first_name":    recipient.get("first_name", user),
        "last_name":     recipient.get("last_name", ""),
        "full_name":     user,
        "locker":        locker_id,
        "pin":           pin,
        "pin_formatted": f"{pin[:3]}-{pin[3:]}" if len(pin) == 6 else pin,
        "has_badge":     bool(recipient.get("badge_id")),
    }


def render_messages(hass: HomeAssistant, templates: dict, variables: dict) -> dict:
    """Rend les 3 templates. Leve TemplateError si un template est invalide."""
    return {
        key: Template(templates.get(key) or DEFAULT_SETTINGS[key], hass)
        .async_render(variables, parse_result=False)
        .strip()
        for key in TEMPLATE_KEYS
    }


def validate_templates(hass: HomeAssistant, templates: dict) -> None:
    """Verifie que les templates se rendent avec des donnees d'exemple."""
    render_messages(hass, templates, _SAMPLE)


# ── API WebSocket (carte Messages) ──────────────────────────────────────────

def async_setup_messages_ws(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_preview)


@websocket_api.websocket_command({
    vol.Required("type"): WS_MESSAGES_PREVIEW,
    **{vol.Optional(key): str for key in TEMPLATE_KEYS},
})
@callback
def ws_preview(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Rend les templates fournis (ou enregistres) avec un destinataire d'exemple."""
    settings = hass.data[DOMAIN]["settings"]
    templates = {key: msg.get(key, settings.get(key)) for key in TEMPLATE_KEYS}
    try:
        rendered = render_messages(hass, templates, _SAMPLE)
    except TemplateError as err:
        connection.send_error(msg["id"], "invalid_template", str(err))
        return
    connection.send_result(msg["id"], {
        "rendered":  rendered,
        "variables": TEMPLATE_VARIABLES,
        "sample":    _SAMPLE,
        "defaults":  {key: DEFAULT_SETTINGS[key] for key in TEMPLATE_KEYS},
    })
