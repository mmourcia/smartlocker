import logging
import pathlib
import voluptuous as vol

from homeassistant.components.http import StaticPathConfig
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, STATE_OFF, STATE_ON
from homeassistant.core import Event, HomeAssistant, ServiceCall, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.entity_component import EntityComponent
from homeassistant.helpers.event import async_track_state_change_event
from .const import (
    DOMAIN,
    LOCKER_IDS,
    SERVICE_ASSIGN,
    SERVICE_UNASSIGN,
    SERVICE_OPEN,
    SERVICE_NOTIFY,
    SERVICE_RESET,
    ATTR_LOCKER_ID,
    ATTR_USER,
    ESPHOME_BUTTON_OPEN,
    ESPHOME_DOOR_SENSOR,
    DEFAULT_NOTIFICATION_TITLE,
    CONF_PIN_SENSOR,
    EVENT_CODE_ENTERED,
    EVENT_KEY_PRESSED,
    EVENT_TAG_SCANNED,
    STATE_OCCUPIED,
    STATE_WAITING,
)
from .entity import LockerEntity
from .leds import LedController, async_setup_leds_ws
from .recipients import async_setup_recipients

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = vol.Schema({
    DOMAIN: vol.Any(None, vol.Schema({
        vol.Optional(CONF_PIN_SENSOR): cv.string,  # obsolete, ignore
    }))
}, extra=vol.ALLOW_EXTRA)

_CARD_URL = "/smart_locker/smart-locker-card.js"
_WWW = pathlib.Path(__file__).parent / "www"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    await _async_setup_frontend(hass)

    component = EntityComponent(_LOGGER, DOMAIN, hass)
    lockers = {i: LockerEntity(i) for i in LOCKER_IDS}
    await component.async_add_entities(lockers.values())
    hass.data[DOMAIN] = {"lockers": lockers}
    await async_setup_recipients(hass)

    leds = LedController(hass, lockers)
    hass.data[DOMAIN]["leds"] = leds
    async_setup_leds_ws(hass)

    if CONF_PIN_SENSOR in (config.get(DOMAIN) or {}):
        _LOGGER.warning(
            "smart_locker: l'option '%s' est obsolete et ignoree - le PIN est recu "
            "via l'evenement %s", CONF_PIN_SENSOR, EVENT_CODE_ENTERED,
        )

    # --- Digicode -----------------------------------------------------------
    # Evenements plutot que changement d'etat du capteur PIN : un meme code saisi
    # deux fois de suite declenche bien deux traitements.

    @callback
    def code_entered(event: Event) -> None:
        entered_pin = str(event.data.get("code", "")).strip()
        if not entered_pin:
            return
        for locker in lockers.values():
            if locker.pin_code == entered_pin and locker.state in (STATE_OCCUPIED, STATE_WAITING):
                _LOGGER.info("PIN reconnu - ouverture casier %s", locker.locker_id)
                hass.async_create_task(hass.services.async_call(
                    "button", "press",
                    {"entity_id": ESPHOME_BUTTON_OPEN.format(locker.locker_id)},
                ))
                leds.show_access(locker.locker_id)
                locker.mark_retrieved()
                return
        _LOGGER.warning("PIN saisi non reconnu sur aucun casier assigne")
        leds.show_error()

    @callback
    def keypad_activity(_event: Event) -> None:
        leds.activity()

    hass.bus.async_listen(EVENT_CODE_ENTERED, code_entered)
    hass.bus.async_listen(EVENT_KEY_PRESSED, keypad_activity)
    hass.bus.async_listen(EVENT_TAG_SCANNED, keypad_activity)

    # --- Eclairage : portes et etats des casiers ----------------------------

    door_to_locker = {ESPHOME_DOOR_SENSOR.format(i): i for i in LOCKER_IDS}

    @callback
    def door_changed(event: Event) -> None:
        new_state = event.data.get("new_state")
        old_state = event.data.get("old_state")
        if new_state is None or new_state.state not in (STATE_ON, STATE_OFF):
            return
        was_known = old_state is not None and old_state.state in (STATE_ON, STATE_OFF)
        # Reconnexion ESPHome (unavailable -> off) : pas une activite
        if (was_known and old_state.state == new_state.state) or (not was_known and new_state.state == STATE_OFF):
            return
        leds.door_changed(door_to_locker[event.data["entity_id"]], new_state.state == STATE_ON)

    @callback
    def locker_changed(_event: Event) -> None:
        leds.render()

    async_track_state_change_event(hass, list(door_to_locker), door_changed)
    async_track_state_change_event(
        hass, [locker.entity_id for locker in lockers.values()], locker_changed
    )

    @callback
    def _start_leds(_event: Event | None = None) -> None:
        for entity_id, locker_id in door_to_locker.items():
            state = hass.states.get(entity_id)
            if state and state.state == STATE_ON:
                leds.door_changed(locker_id, True)
        leds.render()

    if hass.is_running:
        _start_leds()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _start_leds)

    # --- Services -----------------------------------------------------------

    async def handle_assign(call: ServiceCall) -> None:
        locker_id = call.data[ATTR_LOCKER_ID]
        user = call.data[ATTR_USER]
        locker = lockers.get(locker_id)
        if not locker:
            _LOGGER.error("Casier %s introuvable", locker_id)
            return
        locker.assign(user)
        _LOGGER.info("Casier %s assigne a %s", locker_id, user)

    async def handle_open(call: ServiceCall) -> None:
        locker_id = call.data[ATTR_LOCKER_ID]
        locker = lockers.get(locker_id)
        if not locker:
            _LOGGER.error("Casier %s introuvable", locker_id)
            return
        button_entity = ESPHOME_BUTTON_OPEN.format(locker_id)
        await hass.services.async_call("button", "press", {"entity_id": button_entity})
        leds.show_access(locker_id)
        locker.mark_retrieved()
        _LOGGER.info("Casier %s ouvert - colis recupere", locker_id)

    async def handle_unassign(call: ServiceCall) -> None:
        locker_id = call.data[ATTR_LOCKER_ID]
        user = call.data[ATTR_USER]
        locker = lockers.get(locker_id)
        if not locker:
            _LOGGER.error("Casier %s introuvable", locker_id)
            return
        locker.unassign(user)
        _LOGGER.info("Utilisateur %s retire du casier %s", user, locker_id)

    async def handle_notify(call: ServiceCall) -> None:
        locker_id = call.data[ATTR_LOCKER_ID]
        locker = lockers.get(locker_id)
        if not locker:
            _LOGGER.error("Casier %s introuvable", locker_id)
            return
        assigned = locker.extra_state_attributes.get("assigned_users", [])
        if not assigned:
            _LOGGER.warning("Casier %s : aucun utilisateur assigne", locker_id)
            return

        pin = locker.pin_code or "?"
        pin_fmt = f"{pin[:3]}-{pin[3:]}" if len(pin) == 6 else pin
        title = hass.data[DOMAIN]["settings"].get("notification_title", DEFAULT_NOTIFICATION_TITLE)
        recipients = hass.data[DOMAIN]["recipients"]
        already_notified = locker.extra_state_attributes.get("notified_at", {})
        notified = False  # au moins un destinataire notifie

        for user in assigned:
            if user in already_notified:
                _LOGGER.info("Utilisateur '%s' deja notifie pour casier %s - ignore", user, locker_id)
                continue
            recipient = next(
                (r for r in recipients if f"{r['first_name']} {r['last_name']}" == user),
                None,
            )
            first_name = recipient["first_name"] if recipient else user
            email    = (recipient or {}).get("email",  "")
            mobile   = (recipient or {}).get("mobile", "")
            services = (recipient or {}).get("notify_services", [])

            if not services:
                _LOGGER.warning("Aucun service de notification configure pour '%s'", user)
                continue

            message = (
                f"Bonjour {first_name}, un colis a été déposé dans le casier {locker_id}. "
                f"Votre code PIN est {pin_fmt}. "
                "Saisissez-le sur le digicode pour récupérer votre colis."
            )
            html = (
                "<html><body style='font-family:Arial,sans-serif;max-width:480px;"
                "margin:0 auto;padding:24px;color:#333;'>"
                "<h2 style='color:#2196F3;margin-bottom:4px;'>"
                "\U0001f4e6 Un colis vous attend !</h2>"
                f"<p>Bonjour <strong>{first_name}</strong>,</p>"
                f"<p>Un colis a été déposé dans le <strong>casier {locker_id}</strong>.</p>"
                "<p style='margin-bottom:6px;'>Votre code PIN&nbsp;:</p>"
                "<div style='text-align:center;margin:20px 0;'>"
                f"<span style='font-size:2.8em;font-family:monospace;font-weight:bold;"
                f"letter-spacing:10px;color:#1565C0;background:#E3F2FD;"
                f"padding:14px 28px;border-radius:10px;display:inline-block;'>"
                f"{pin_fmt}</span></div>"
                "<p>Rendez-vous devant le meuble et saisissez ce code sur le digicode.</p>"
                "<hr style='border:none;border-top:1px solid #eee;margin:24px 0;'>"
                "<p style='font-size:0.8em;color:#aaa;'>Smart Locker</p>"
                "</body></html>"
            )

            _EMAIL_SVC = ("smtp", "mail", "gmail", "imap", "email")
            user_notified = False
            for svc in services:
                svc_is_email = any(k in svc.lower() for k in _EMAIL_SVC)
                data: dict = {"title": title, "message": message}

                if svc_is_email:
                    if not email:
                        _LOGGER.warning(
                            "notify.%s nécessite un email mais '%s' n'en a pas", svc, user
                        )
                        continue
                    data["target"] = [email]
                    data["data"]   = {"html": html}
                else:
                    if not mobile:
                        _LOGGER.warning(
                            "notify.%s nécessite un numéro mobile mais '%s' n'en a pas — "
                            "renseigner le champ Tél mobile dans la carte Destinataires",
                            svc, user,
                        )
                        continue
                    data["target"] = [mobile]

                try:
                    await hass.services.async_call("notify", svc, data)
                    _LOGGER.info(
                        "notify.%s → %s pour casier %s",
                        svc, data["target"][0], locker_id,
                    )
                    user_notified = True
                except Exception as err:
                    _LOGGER.error("Erreur notify.%s pour %s : %s", svc, user, err)
            if user_notified:
                locker.mark_user_notified(user)
                notified = True
            else:
                _LOGGER.warning(
                    "Aucune notification envoyee a '%s' pour casier %s - il reste notifiable",
                    user, locker_id,
                )

        if notified:
            locker.notify_sent()

    async def handle_reset(call: ServiceCall) -> None:
        locker_id = call.data[ATTR_LOCKER_ID]
        locker = lockers.get(locker_id)
        if not locker:
            _LOGGER.error("Casier %s introuvable", locker_id)
            return
        locker.reset()
        _LOGGER.info("Casier %s remis a libre", locker_id)

    locker_id_schema = vol.All(vol.Coerce(int), vol.In(LOCKER_IDS))
    user_schema = vol.Schema({
        vol.Required(ATTR_LOCKER_ID): locker_id_schema,
        vol.Required(ATTR_USER): cv.string,
    })

    hass.services.async_register(DOMAIN, SERVICE_ASSIGN,   handle_assign,   schema=user_schema)
    hass.services.async_register(DOMAIN, SERVICE_UNASSIGN, handle_unassign, schema=user_schema)
    hass.services.async_register(DOMAIN, SERVICE_OPEN,   handle_open,
        schema=vol.Schema({vol.Required(ATTR_LOCKER_ID): locker_id_schema}))
    hass.services.async_register(DOMAIN, SERVICE_NOTIFY, handle_notify,
        schema=vol.Schema({vol.Required(ATTR_LOCKER_ID): locker_id_schema}))
    hass.services.async_register(DOMAIN, SERVICE_RESET,  handle_reset,
        schema=vol.Schema({vol.Required(ATTR_LOCKER_ID): locker_id_schema}))

    return True


async def _async_setup_frontend(hass: HomeAssistant) -> None:
    """Servir le JS et planifier l'enregistrement de la ressource Lovelace."""
    await hass.http.async_register_static_paths([
        StaticPathConfig(_CARD_URL, str(_WWW / "smart-locker-card.js"), cache_headers=False),
    ])

    async def _register_lovelace(_event: Event | None = None) -> None:
        try:
            lovelace = hass.data.get("lovelace")
            resources = getattr(lovelace, "resources", None)
            if resources is None:
                _LOGGER.warning(
                    "Ressource Lovelace non enregistree automatiquement - ajouter manuellement : "
                    "Parametres > Tableaux de bord > Ressources > %s (Module JavaScript)",
                    _CARD_URL,
                )
                return
            await resources.async_load(True)
            if not any(r.get("url") == _CARD_URL for r in resources.async_items()):
                await resources.async_create_item({"res_type": "module", "url": _CARD_URL})
                _LOGGER.info("Ressource Lovelace enregistree : %s", _CARD_URL)
        except Exception as err:
            _LOGGER.warning(
                "Auto-enregistrement Lovelace echoue (%s) - ajouter manuellement : "
                "Parametres > Tableaux de bord > Ressources > %s (Module JavaScript)",
                err, _CARD_URL,
            )

    if hass.is_running:
        await _register_lovelace()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _register_lovelace)
