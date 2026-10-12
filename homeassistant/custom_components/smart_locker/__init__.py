import json
import logging
import pathlib
import voluptuous as vol

from homeassistant.components.http import StaticPathConfig
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED, STATE_OFF, STATE_ON
from homeassistant.core import Event, HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import ServiceValidationError, TemplateError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.entity_component import EntityComponent
from homeassistant.helpers.event import async_call_later, async_track_state_change_event
from homeassistant.helpers.storage import Store
from .const import (
    DOMAIN,
    LOCKER_IDS,
    SERVICE_ASSIGN,
    SERVICE_UNASSIGN,
    SERVICE_OPEN,
    SERVICE_NOTIFY,
    SERVICE_RESET,
    SERVICE_SET_OUT_OF_SERVICE,
    ATTR_OUT_OF_SERVICE,
    ATTR_LOCKER_ID,
    ATTR_USER,
    ATTR_RECIPIENT_ID,
    EVENT_RETRIEVED,
    OPEN_CONFIRM_SECONDS,
    STORE_KEY_LOCKERS,
    STORE_VERSION,
    ESPHOME_BUTTON_OPEN,
    ESPHOME_DOOR_SENSOR,
    CONF_PIN_SENSOR,
    EVENT_CODE_ENTERED,
    EVENT_KEY_PRESSED,
    EVENT_KEYPAD_TIMEOUT,
    EVENT_BADGE_SCANNED,
    STATE_OCCUPIED,
    STATE_WAITING,
    STATE_RETRIEVED,
)
from .badges import BadgeEnrollment, async_setup_badges_ws, find_by_badge, full_name
from .entity import LockerEntity
from .leds import LedController, async_setup_leds_ws
from .messages import async_setup_messages_ws, message_variables, render_messages
from .recipients import async_setup_recipients

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = vol.Schema({
    DOMAIN: vol.Any(None, vol.Schema({
        vol.Optional(CONF_PIN_SENSOR): cv.string,  # obsolete, ignore
    }))
}, extra=vol.ALLOW_EXTRA)

_CARD_URL = "/smart_locker/smart-locker-card.js"
_WWW = pathlib.Path(__file__).parent / "www"
_VERSION = json.loads((pathlib.Path(__file__).parent / "manifest.json").read_text())["version"]
# La version dans l'URL force le navigateur a recharger le JS a chaque mise a jour
_RESOURCE_URL = f"{_CARD_URL}?v={_VERSION}"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    await _async_setup_frontend(hass)

    # Etats des casiers persistes a chaque changement : un redemarrage de HA (ou une
    # coupure de courant) ne perd ni les PIN ni les assignations.
    store = Store(hass, STORE_VERSION, STORE_KEY_LOCKERS)
    saved = (await store.async_load() or {}).get("lockers", {})

    @callback
    def _save_lockers() -> None:
        store.async_delay_save(
            lambda: {"lockers": {str(i): l.as_dict() for i, l in lockers.items()}}, 1
        )

    lockers = {i: LockerEntity(i, saved.get(str(i)), _save_lockers) for i in LOCKER_IDS}
    hass.data[DOMAIN] = {"lockers": lockers}
    await async_setup_recipients(hass)  # avant l'ajout : les entites affichent les noms
    component = EntityComponent(_LOGGER, DOMAIN, hass)
    await component.async_add_entities(lockers.values())

    leds = LedController(hass, lockers)
    hass.data[DOMAIN]["leds"] = leds
    async_setup_leds_ws(hass)
    badges = BadgeEnrollment(hass)
    hass.data[DOMAIN]["badges"] = badges
    async_setup_badges_ws(hass)
    async_setup_messages_ws(hass)

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
                open_lockers([locker])
                return
        _LOGGER.warning("PIN saisi non reconnu sur aucun casier assigne")
        leds.show_error()

    @callback
    def badge_scanned(event: Event) -> None:
        badge_id = str(event.data.get("tag_id", "")).strip()
        if not badge_id or badges.capture(badge_id):  # capture = enrolement en cours
            return
        recipient = find_by_badge(hass, badge_id)
        if recipient is None:
            _LOGGER.warning("Badge %s inconnu", badge_id)
            leds.show_error()
            return
        user = full_name(recipient)
        targets = [
            locker for locker in lockers.values()
            if recipient["id"] in locker.assigned_ids and locker.state in (STATE_OCCUPIED, STATE_WAITING)
        ]
        if not targets:
            _LOGGER.info("Badge de %s : aucun colis en attente", user)
            leds.show_error()
            return
        _LOGGER.info("Badge de %s - ouverture casier(s) %s", user, [l.locker_id for l in targets])
        open_lockers(targets)

    # Casiers dont la serrure vient d'etre actionnee par PIN / badge, en attente de
    # l'ouverture de la porte : {locker_id: annulation du delai}
    awaiting_door: dict[int, callback] = {}

    @callback
    def press_relays(locker_ids) -> None:
        """Impulsion relais (alim dimensionnee pour 7 solenoides simultanes)."""
        hass.async_create_task(hass.services.async_call(
            "button", "press",
            {"entity_id": [ESPHOME_BUTTON_OPEN.format(lid) for lid in locker_ids]},
        ))
        leds.show_access(*locker_ids)

    @callback
    def open_lockers(targets: list) -> None:
        """Ouverture par le destinataire. Le colis n'est considere recupere qu'a
        l'ouverture effective de la porte (reed switch)."""
        press_relays([locker.locker_id for locker in targets])
        for locker in targets:
            lid = locker.locker_id
            if cancel := awaiting_door.pop(lid, None):
                cancel()
            door = hass.states.get(ESPHOME_DOOR_SENSOR.format(lid))
            if door and door.state == STATE_ON:  # porte deja ouverte (mal refermee)
                retrieved(locker)
                continue

            @callback
            def _no_door(_now, locker=locker) -> None:
                awaiting_door.pop(locker.locker_id, None)
                _LOGGER.warning(
                    "Casier %s : porte non ouverte dans les %s s - le colis reste en attente",
                    locker.locker_id, OPEN_CONFIRM_SECONDS,
                )

            awaiting_door[lid] = async_call_later(hass, OPEN_CONFIRM_SECONDS, _no_door)

    @callback
    def retrieved(locker) -> None:
        locker.mark_retrieved()
        hass.bus.async_fire(EVENT_RETRIEVED, {
            "locker_id":  locker.locker_id,
            "recipients": [full_name(r) for r in hass.data[DOMAIN]["recipients"]
                           if r["id"] in locker.assigned_ids],
        })
        _LOGGER.info("Casier %s : colis recupere", locker.locker_id)

    @callback
    def keypad_activity(_event: Event) -> None:
        leds.activity()

    @callback
    def keypad_timeout(_event: Event) -> None:
        # Saisie abandonnee : meme signal qu'un mauvais code, l'utilisateur peut recommencer
        leds.show_error()

    hass.bus.async_listen(EVENT_CODE_ENTERED, code_entered)
    hass.bus.async_listen(EVENT_KEY_PRESSED, keypad_activity)
    hass.bus.async_listen(EVENT_KEYPAD_TIMEOUT, keypad_timeout)
    hass.bus.async_listen(EVENT_BADGE_SCANNED, badge_scanned)

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
        locker_id = door_to_locker[event.data["entity_id"]]
        is_open = new_state.state == STATE_ON
        locker = lockers[locker_id]
        if is_open and (cancel := awaiting_door.pop(locker_id, None)):
            cancel()
            retrieved(locker)
        elif not is_open and locker.state == STATE_RETRIEVED:
            locker.reset()
            _LOGGER.info("Casier %s : porte refermee apres recuperation - casier libere", locker_id)
        leds.door_changed(locker_id, is_open)

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

    def resolve_recipient(call: ServiceCall) -> str:
        """recipient_id, ou a defaut nom « Prenom Nom » (compatibilite)."""
        recipients = hass.data[DOMAIN]["recipients"]
        if rid := call.data.get(ATTR_RECIPIENT_ID):
            if any(r["id"] == rid for r in recipients):
                return rid
            # destinataire supprime encore assigne : on accepte de le retirer
            if call.service == SERVICE_UNASSIGN and rid in lockers[call.data[ATTR_LOCKER_ID]].assigned_ids:
                return rid
            raise ServiceValidationError(f"Destinataire {rid} introuvable")
        name = call.data[ATTR_USER].strip()
        for r in recipients:
            if full_name(r) == name:
                return r["id"]
        raise ServiceValidationError(f"Destinataire '{name}' introuvable")

    def check_in_service(locker) -> None:
        if locker.out_of_service:
            raise ServiceValidationError(
                f"Casier {locker.locker_id} hors service - le remettre en service d'abord"
            )

    async def handle_assign(call: ServiceCall) -> None:
        locker_id = call.data[ATTR_LOCKER_ID]
        check_in_service(lockers[locker_id])
        rid = resolve_recipient(call)
        lockers[locker_id].assign(rid)
        _LOGGER.info("Casier %s assigne a %s", locker_id, rid)

    async def handle_open(call: ServiceCall) -> None:
        locker_id = call.data[ATTR_LOCKER_ID]
        locker = lockers.get(locker_id)
        if not locker:
            _LOGGER.error("Casier %s introuvable", locker_id)
            return
        # Ouverture par l'administrateur (depot, verification) : pas de changement d'etat
        press_relays([locker_id])
        _LOGGER.info("Casier %s ouvert depuis le dashboard", locker_id)

    async def handle_unassign(call: ServiceCall) -> None:
        locker_id = call.data[ATTR_LOCKER_ID]
        rid = resolve_recipient(call)
        lockers[locker_id].unassign(rid)
        _LOGGER.info("Destinataire %s retire du casier %s", rid, locker_id)

    async def handle_notify(call: ServiceCall) -> None:
        locker_id = call.data[ATTR_LOCKER_ID]
        locker = lockers.get(locker_id)
        if not locker:
            _LOGGER.error("Casier %s introuvable", locker_id)
            return
        check_in_service(locker)
        assigned = locker.assigned_ids
        if not assigned:
            _LOGGER.warning("Casier %s : aucun utilisateur assigne", locker_id)
            return

        pin = locker.pin_code or "?"
        settings = hass.data[DOMAIN]["settings"]
        recipients = hass.data[DOMAIN]["recipients"]
        already_notified = locker.notified_ids
        notified = False  # au moins un destinataire notifie

        for rid in assigned:
            recipient = next((r for r in recipients if r["id"] == rid), None)
            if recipient is None:
                _LOGGER.warning("Casier %s : destinataire %s supprime - ignore", locker_id, rid)
                continue
            user = full_name(recipient)
            if rid in already_notified:
                _LOGGER.info("Utilisateur '%s' deja notifie pour casier %s - ignore", user, locker_id)
                continue
            email    = (recipient or {}).get("email",  "")
            mobile   = (recipient or {}).get("mobile", "")
            services = (recipient or {}).get("notify_services", [])

            if not services:
                _LOGGER.warning("Aucun service de notification configure pour '%s'", user)
                continue

            try:
                rendered = render_messages(
                    hass, settings, message_variables(recipient, user, locker_id, pin)
                )
            except TemplateError as err:
                _LOGGER.error("Template de message invalide (carte Messages) : %s", err)
                return
            title, message, html = (
                rendered["notification_title"], rendered["msg_text"], rendered["msg_email_html"]
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
                locker.mark_user_notified(rid)
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

    async def handle_set_out_of_service(call: ServiceCall) -> None:
        locker_id = call.data[ATTR_LOCKER_ID]
        enabled = call.data[ATTR_OUT_OF_SERVICE]
        lockers[locker_id].set_out_of_service(enabled)
        _LOGGER.info("Casier %s %s", locker_id, "hors service" if enabled else "remis en service")

    locker_id_schema = vol.All(vol.Coerce(int), vol.In(LOCKER_IDS))
    user_schema = vol.All(
        vol.Schema({
            vol.Required(ATTR_LOCKER_ID): locker_id_schema,
            vol.Exclusive(ATTR_RECIPIENT_ID, "recipient"): cv.string,
            vol.Exclusive(ATTR_USER, "recipient"): cv.string,
        }),
        cv.has_at_least_one_key(ATTR_RECIPIENT_ID, ATTR_USER),
    )

    hass.services.async_register(DOMAIN, SERVICE_ASSIGN,   handle_assign,   schema=user_schema)
    hass.services.async_register(DOMAIN, SERVICE_UNASSIGN, handle_unassign, schema=user_schema)
    hass.services.async_register(DOMAIN, SERVICE_OPEN,   handle_open,
        schema=vol.Schema({vol.Required(ATTR_LOCKER_ID): locker_id_schema}))
    hass.services.async_register(DOMAIN, SERVICE_NOTIFY, handle_notify,
        schema=vol.Schema({vol.Required(ATTR_LOCKER_ID): locker_id_schema}))
    hass.services.async_register(DOMAIN, SERVICE_SET_OUT_OF_SERVICE, handle_set_out_of_service,
        schema=vol.Schema({
            vol.Required(ATTR_LOCKER_ID): locker_id_schema,
            vol.Required(ATTR_OUT_OF_SERVICE): cv.boolean,
        }))
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
            if not resources.loaded:  # meme schema que lovelace/resources.py
                await resources.async_load()
                resources.loaded = True
            existing = [
                r for r in resources.async_items()
                if r.get("url", "").split("?")[0] == _CARD_URL
            ]
            if not existing:
                await resources.async_create_item({"res_type": "module", "url": _RESOURCE_URL})
                _LOGGER.info("Ressource Lovelace enregistree : %s", _RESOURCE_URL)
            elif existing[0].get("url") != _RESOURCE_URL:
                await resources.async_update_item(
                    existing[0]["id"], {"res_type": "module", "url": _RESOURCE_URL}
                )
                _LOGGER.info("Ressource Lovelace mise a jour : %s", _RESOURCE_URL)
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
