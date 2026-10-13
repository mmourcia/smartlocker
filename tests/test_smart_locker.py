"""Tests du composant smart_locker : digicode, eclairage WLED (mocke), parametres."""
import asyncio
from unittest.mock import patch
import pytest
import custom_components.smart_locker
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry, async_mock_service, async_fire_time_changed
from homeassistant.util import dt as dt_util
from datetime import timedelta

CLOCK = [1000.0]

@pytest.fixture
async def setup(hass, aioclient_mock):
    aioclient_mock.post("http://10.0.0.9/json/state", json={"success": True})
    entry = MockConfigEntry(domain="wled", title="WLED-Gledopto", data={"host": "10.0.0.9"})
    entry.add_to_hass(hass)
    presses = async_mock_service(hass, "button", "press")
    # Carte relais aux anciens entity_id fixes (installation existante)
    for i in (1, 2, 4, 5, 6, 7, 8):
        hass.states.async_set(f"button.smart_locker_relais_ouvrir_casier_{i}", "unknown")
        hass.states.async_set(f"binary_sensor.smart_locker_relais_porte_casier_{i}", "off")
    with patch("custom_components.smart_locker._async_setup_frontend"), \
         patch("custom_components.smart_locker.leds.time.monotonic", lambda: CLOCK[0]):
        assert await async_setup_component(hass, "smart_locker", {"smart_locker": None})
        await hass.async_block_till_done()
        from custom_components.smart_locker.const import DOMAIN
        hass.data[DOMAIN]["settings"]["led_entry_id"] = entry.entry_id
        hass.data[DOMAIN]["recipients"].append(
            {"id": "r-jean", "first_name": "Jean", "last_name": "Dupont", "notify_services": []})
        yield presses

def last(aioclient_mock):
    return aioclient_mock.mock_calls[-1][2]

def segs(p):
    return {s["id"] + 1: (tuple(s["col"][0]), s["fx"]) if s["on"] else None for s in p["seg"]}

async def test_flow(hass, aioclient_mock, setup):
    presses = setup
    from custom_components.smart_locker.const import DOMAIN
    assert sorted(hass.data[DOMAIN]["lockers"]) == [1, 2, 4, 5, 6, 7, 8]
    assert hass.states.get("smart_locker.casier_3") is None
    n0 = aioclient_mock.call_count

    # Pas d'activite -> rien d'allume (aucun envoi ou "off")
    hass.data[DOMAIN]["leds"].settings_changed(); await hass.async_block_till_done()
    assert last(aioclient_mock) == {"on": False}

    # Assignation casier 2 puis touche clavier -> session
    await hass.services.async_call("smart_locker", "assign", {"locker_id": 2, "user": "Jean Dupont"}, blocking=True)
    hass.bus.async_fire("esphome.keypad_key_pressed", {}); await hass.async_block_till_done()
    p = last(aioclient_mock)
    s = segs(p)
    assert p["on"] and p["bri"] == 190
    assert s[2] == ((0, 75, 255), 0) and s[1] == ((0, 255, 0), 0) and s[3] is None
    calls = aioclient_mock.call_count
    hass.bus.async_fire("esphome.keypad_key_pressed", {}); await hass.async_block_till_done()
    assert aioclient_mock.call_count == calls, "pas de renvoi si etat identique"

    # Mauvais code, deux fois de suite -> rouge clignotant a chaque fois
    for _ in range(2):
        hass.bus.async_fire("esphome.keypad_code_entered", {"code": "000000"}); await hass.async_block_till_done()
        s = segs(last(aioclient_mock))
        assert all(s[i] == ((255, 0, 0), 1) for i in (1, 2, 4, 5, 6, 7, 8)) and s[3] is None
        CLOCK[0] += 4; async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=4)); await hass.async_block_till_done()
        assert segs(last(aioclient_mock))[2] == ((0, 75, 255), 0)

    # Bon code -> casier 2 vert clignotant seul, relais declenche
    pin = hass.states.get("smart_locker.casier_2").attributes["pin_code"]
    hass.bus.async_fire("esphome.keypad_code_entered", {"code": pin}); await hass.async_block_till_done()
    assert presses[-1].data == {"entity_id": ["button.smart_locker_relais_ouvrir_casier_2"]}
    assert hass.states.get("smart_locker.casier_2").state == "occupé", "recupere seulement a l'ouverture"
    s = segs(last(aioclient_mock))
    assert s[2] == ((0, 255, 0), 1) and all(s[i] is None for i in (1, 3, 4, 5, 6, 7, 8))

    # Ouverture de la porte -> recupere + evenement
    events = []
    hass.bus.async_listen("smart_locker_retrieved", events.append)
    hass.states.async_set("binary_sensor.smart_locker_relais_porte_casier_2", "on"); await hass.async_block_till_done()
    assert hass.states.get("smart_locker.casier_2").state == "récupéré"
    assert events[0].data == {"locker_id": 2, "recipients": ["Jean Dupont"]}

    # Porte 2 ouverte trop longtemps -> orange clignotant
    CLOCK[0] += 61; async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=70)); await hass.async_block_till_done()
    s = segs(last(aioclient_mock))
    s = segs(last(aioclient_mock))
    assert s[2] == ((255, 110, 0), 1) and s[1] is None, s   # session expiree (30 s) : seule l'alerte reste
    hass.states.async_set("binary_sensor.smart_locker_relais_porte_casier_2", "off"); await hass.async_block_till_done()
    s = segs(last(aioclient_mock))
    assert s[2] == ((0, 255, 0), 0), s   # fermeture = activite recente -> session, casier libre en vert
    st = hass.states.get("smart_locker.casier_2")
    assert st.state == "libre" and "pin_code" not in st.attributes, "liberation automatique a la fermeture"

    # Fin de session -> extinction
    CLOCK[0] += 31; async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=120)); await hass.async_block_till_done()
    assert last(aioclient_mock) == {"on": False}

async def test_settings_ws(hass, hass_ws_client, setup):
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "smart_locker/leds/devices"})
    r = await asyncio.wait_for(ws.receive_json(), 2); assert r["result"][0]["title"] == "WLED-Gledopto"
    await ws.send_json({"id": 2, "type": "smart_locker/settings/set", "led_brightness": 80, "led_timeout": 45})
    r = await asyncio.wait_for(ws.receive_json(), 2); assert r["success"] and r["result"]["led_brightness"] == 80 and r["result"]["notification_title"]
    await ws.send_json({"id": 3, "type": "smart_locker/settings/set", "led_brightness": 999})
    r = await asyncio.wait_for(ws.receive_json(), 2); assert not r["success"]
    await ws.send_json({"id": 4, "type": "smart_locker/leds/test"})
    r = await asyncio.wait_for(ws.receive_json(), 2); assert r["success"]

async def test_locker3_refused(hass, setup):
    import voluptuous as vol
    with pytest.raises(vol.Invalid):
        await hass.services.async_call("smart_locker", "open", {"locker_id": 3}, blocking=True)

async def test_reconnect_no_activity(hass, aioclient_mock, setup):
    e = "binary_sensor.smart_locker_relais_porte_casier_4"
    hass.states.async_set(e, "unavailable"); await hass.async_block_till_done()
    n = aioclient_mock.call_count
    hass.states.async_set(e, "off"); await hass.async_block_till_done()
    assert aioclient_mock.call_count == n

async def test_keypad_timeout_is_error(hass, aioclient_mock, setup):
    hass.bus.async_fire("esphome.keypad_timeout", {}); await hass.async_block_till_done()
    s = segs(last(aioclient_mock))
    assert all(s[i] == ((255, 0, 0), 1) for i in (1, 2, 4, 5, 6, 7, 8))


async def test_generic_tag_ignored(hass, aioclient_mock, setup):
    """Un tag HA generique (ex. NFC d'un telephone) n'agit pas sur les casiers."""
    n = aioclient_mock.call_count
    hass.bus.async_fire("tag_scanned", {"tag_id": "1234"}); await hass.async_block_till_done()
    assert aioclient_mock.call_count == n


async def _add(ws, i, first, last):
    await ws.send_json({"id": i, "type": "smart_locker/recipients/add", "first_name": first, "last_name": last})
    return (await asyncio.wait_for(ws.receive_json(), 2))["result"]


async def test_badge_enroll_conflict_and_open(hass, hass_ws_client, aioclient_mock, setup):
    presses = setup
    ws = await hass_ws_client(hass)
    jean = await _add(ws, 1, "Jean", "Dupont")
    anne = await _add(ws, 2, "Anne", "Martin")

    # Enrolement de Jean
    await ws.send_json({"id": 3, "type": "smart_locker/badges/enroll", "recipient_id": jean["id"]})
    assert (await asyncio.wait_for(ws.receive_json(), 2))["success"]
    assert (await asyncio.wait_for(ws.receive_json(), 2))["event"]["status"] == "waiting"
    hass.bus.async_fire("esphome.badge_scanned", {"tag_id": "777"}); await hass.async_block_till_done()
    assert (await asyncio.wait_for(ws.receive_json(), 2))["event"] == {"status": "enrolled", "badge_id": "777"}
    assert not presses, "un badge en cours d'enrolement n'ouvre rien"

    # Meme badge pour Anne -> conflit
    await ws.send_json({"id": 4, "type": "smart_locker/badges/enroll", "recipient_id": anne["id"]})
    await asyncio.wait_for(ws.receive_json(), 2); await asyncio.wait_for(ws.receive_json(), 2)
    hass.bus.async_fire("esphome.badge_scanned", {"tag_id": "777"}); await hass.async_block_till_done()
    ev = (await asyncio.wait_for(ws.receive_json(), 2))["event"]
    assert ev["status"] == "conflict" and ev["owner"] == "Jean Dupont"
    # Annulation implicite : Jean garde le badge
    from custom_components.smart_locker.badges import find_by_badge
    assert find_by_badge(hass, "777")["id"] == jean["id"]

    # Edition de Jean (formulaire) : le badge est conserve
    await ws.send_json({"id": 5, "type": "smart_locker/recipients/update", "recipient_id": jean["id"],
                        "first_name": "Jean", "last_name": "Dupont", "mobile": "0600000000"})
    assert (await asyncio.wait_for(ws.receive_json(), 2))["result"]["badge_id"] == "777"

    # Reattribution forcee a Anne
    await ws.send_json({"id": 6, "type": "smart_locker/badges/assign", "recipient_id": anne["id"], "badge_id": "777"})
    r = await asyncio.wait_for(ws.receive_json(), 2); assert r["error"]["code"] == "conflict"
    await ws.send_json({"id": 7, "type": "smart_locker/badges/assign", "recipient_id": anne["id"], "badge_id": "777", "force": True})
    assert (await asyncio.wait_for(ws.receive_json(), 2))["success"]
    assert find_by_badge(hass, "777")["id"] == anne["id"]

    # Anne a deux colis -> le badge ouvre les deux casiers
    for lid in (4, 6):
        await hass.services.async_call("smart_locker", "assign", {"locker_id": lid, "user": "Anne Martin"}, blocking=True)
    hass.bus.async_fire("esphome.badge_scanned", {"tag_id": "777"}); await hass.async_block_till_done()
    assert sorted(presses[-1].data["entity_id"]) == [
        "button.smart_locker_relais_ouvrir_casier_4", "button.smart_locker_relais_ouvrir_casier_6"]
    s = segs(last(aioclient_mock))
    assert s[4] == s[6] == ((0, 255, 0), 1) and s[1] is None
    hass.states.async_set("binary_sensor.smart_locker_relais_porte_casier_4", "on"); await hass.async_block_till_done()
    assert hass.states.get("smart_locker.casier_4").state == "récupéré"

    # Badge inconnu -> rouge
    CLOCK[0] += 10; async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=10)); await hass.async_block_till_done()
    hass.bus.async_fire("esphome.badge_scanned", {"tag_id": "999"}); await hass.async_block_till_done()
    assert segs(last(aioclient_mock))[1] == ((255, 0, 0), 1)


async def test_badge_enroll_timeout(hass, hass_ws_client, setup):
    ws = await hass_ws_client(hass)
    jean = await _add(ws, 1, "Jean", "Dupont")
    await ws.send_json({"id": 2, "type": "smart_locker/badges/enroll", "recipient_id": jean["id"]})
    await asyncio.wait_for(ws.receive_json(), 2); await asyncio.wait_for(ws.receive_json(), 2)
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=31)); await hass.async_block_till_done()
    assert (await asyncio.wait_for(ws.receive_json(), 2))["event"]["status"] == "timeout"
    assert not hass.data["smart_locker"]["badges"].active


async def test_message_templates(hass, hass_ws_client, setup):
    sent = async_mock_service(hass, "notify", "smtp_test")
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "smart_locker/recipients/add", "first_name": "Jean", "last_name": "Martin",
                        "email": "j@d.fr", "notify_services": ["smtp_test"]})
    jean = (await asyncio.wait_for(ws.receive_json(), 2))["result"]

    # Template invalide refuse
    await ws.send_json({"id": 2, "type": "smart_locker/settings/set", "msg_text": "{{ pin "})
    assert (await asyncio.wait_for(ws.receive_json(), 2))["error"]["code"] == "invalid_template"

    # Apercu
    await ws.send_json({"id": 3, "type": "smart_locker/messages/preview", "notification_title": "Casier {{ locker }}"})
    r = (await asyncio.wait_for(ws.receive_json(), 2))["result"]
    assert r["rendered"]["notification_title"] == "Casier 4" and "pin_formatted" in r["variables"]

    await ws.send_json({"id": 4, "type": "smart_locker/settings/set",
                        "notification_title": "Colis casier {{ locker }}",
                        "msg_email_html": "<b>{{ first_name }}</b> {{ pin_formatted }}"})
    assert (await asyncio.wait_for(ws.receive_json(), 2))["success"]
    await hass.services.async_call("smart_locker", "assign", {"locker_id": 5, "recipient_id": jean["id"]}, blocking=True)
    await hass.services.async_call("smart_locker", "notify", {"locker_id": 5}, blocking=True)
    pin = hass.states.get("smart_locker.casier_5").attributes["pin_code"]
    d = sent[-1].data
    assert d["title"] == "Colis casier 5" and d["target"] == ["j@d.fr"]
    assert d["data"]["html"] == f"<b>Jean</b> {pin[:3]}-{pin[3:]}"
    assert d["message"].startswith("Bonjour Jean, un colis a été déposé dans le casier 5.")
    assert "badge" not in d["message"]
    assert hass.states.get("smart_locker.casier_5").state == "en_attente"


async def test_lovelace_resource_versioned(hass, hass_storage, aioclient_mock):
    """Une ressource existante sans version est mise a jour avec ?v=<version>."""
    hass_storage["lovelace_resources"] = {
        "version": 1, "key": "lovelace_resources",
        "data": {"items": [{"id": "r1", "res_type": "module", "url": "/smart_locker/smart-locker-card.js"}]},
    }
    assert await async_setup_component(hass, "http", {})
    assert await async_setup_component(hass, "lovelace", {})
    assert await async_setup_component(hass, "smart_locker", {"smart_locker": None})
    await hass.async_block_till_done()
    from custom_components.smart_locker import _RESOURCE_URL
    res = hass.data["lovelace"].resources
    urls = [r["url"] for r in res.async_items()]
    assert urls == [_RESOURCE_URL] and "?v=" in _RESOURCE_URL


async def test_lockers_survive_restart(hass, hass_storage, aioclient_mock):
    """Etat, PIN, assignations et notifications sont relus au demarrage."""
    hass_storage["smart_locker_lockers"] = {"version": 1, "key": "smart_locker_lockers", "data": {"lockers": {
        "4": {"state": "en_attente", "assigned": ["r1"], "pin_code": "123456",
              "retrieved_at": None, "notified_at": {"r1": "01/10 10:00"}}}}}
    hass_storage["smart_locker_recipients"] = {"version": 1, "key": "smart_locker_recipients", "data": {
        "recipients": [{"id": "r1", "first_name": "Anne", "last_name": "Martin"}], "settings": {}}}
    presses = async_mock_service(hass, "button", "press")
    hass.states.async_set("button.smart_locker_relais_ouvrir_casier_4", "unknown")
    with patch("custom_components.smart_locker._async_setup_frontend"):
        assert await async_setup_component(hass, "smart_locker", {"smart_locker": None})
        await hass.async_block_till_done()
    st = hass.states.get("smart_locker.casier_4")
    assert st.state == "en_attente" and st.attributes["pin_code"] == "123456"
    assert st.attributes["assigned_recipients"] == [{"id": "r1", "name": "Anne Martin", "notified_at": "01/10 10:00"}]
    assert hass.states.get("smart_locker.casier_1").state == "libre"
    # Le PIN restaure ouvre bien le casier
    hass.bus.async_fire("esphome.keypad_code_entered", {"code": "123456"}); await hass.async_block_till_done()
    assert presses[-1].data["entity_id"] == ["button.smart_locker_relais_ouvrir_casier_4"]
    # Toute modification est sauvegardee
    await hass.services.async_call("smart_locker", "reset", {"locker_id": 4}, blocking=True)
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=5)); await hass.async_block_till_done()
    assert hass_storage["smart_locker_lockers"]["data"]["lockers"]["4"]["state"] == "libre"


async def test_rename_keeps_assignment(hass, hass_ws_client, setup):
    ws = await hass_ws_client(hass)
    await hass.services.async_call("smart_locker", "assign", {"locker_id": 7, "recipient_id": "r-jean"}, blocking=True)
    await ws.send_json({"id": 1, "type": "smart_locker/recipients/update", "recipient_id": "r-jean",
                        "first_name": "Jean-Paul", "last_name": "Dupont"})
    await asyncio.wait_for(ws.receive_json(), 2); await hass.async_block_till_done()
    st = hass.states.get("smart_locker.casier_7")
    assert st.attributes["assigned_users"] == ["Jean-Paul Dupont"] and st.state == "occupé"
    # Suppression : l'assignation reste visible, et peut etre retiree
    await ws.send_json({"id": 2, "type": "smart_locker/recipients/delete", "recipient_id": "r-jean"})
    await asyncio.wait_for(ws.receive_json(), 2); await hass.async_block_till_done()
    assert hass.states.get("smart_locker.casier_7").attributes["assigned_users"] == ["Destinataire supprimé"]
    await hass.services.async_call("smart_locker", "unassign", {"locker_id": 7, "recipient_id": "r-jean"}, blocking=True)
    assert hass.states.get("smart_locker.casier_7").state == "libre"
    # Nom inconnu refuse
    from homeassistant.exceptions import ServiceValidationError
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call("smart_locker", "assign", {"locker_id": 7, "user": "Personne"}, blocking=True)


async def test_door_not_opened_and_admin_open(hass, setup):
    presses = setup
    await hass.services.async_call("smart_locker", "assign", {"locker_id": 8, "user": "Jean Dupont"}, blocking=True)
    pin = hass.states.get("smart_locker.casier_8").attributes["pin_code"]
    hass.bus.async_fire("esphome.keypad_code_entered", {"code": pin}); await hass.async_block_till_done()
    async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=31)); await hass.async_block_till_done()
    # Porte jamais ouverte : le colis reste en attente, l'ouverture tardive ne compte plus
    hass.states.async_set("binary_sensor.smart_locker_relais_porte_casier_8", "on"); await hass.async_block_till_done()
    assert hass.states.get("smart_locker.casier_8").state == "occupé"
    hass.states.async_set("binary_sensor.smart_locker_relais_porte_casier_8", "off"); await hass.async_block_till_done()
    # Le PIN reste valide
    hass.bus.async_fire("esphome.keypad_code_entered", {"code": pin}); await hass.async_block_till_done()
    assert len(presses) == 2
    # Bouton Ouvrir du dashboard : impulsion sans changement d'etat
    await hass.services.async_call("smart_locker", "open", {"locker_id": 1}, blocking=True)
    assert presses[-1].data["entity_id"] == ["button.smart_locker_relais_ouvrir_casier_1"]
    assert hass.states.get("smart_locker.casier_1").state == "libre"


async def test_out_of_service(hass, aioclient_mock, setup):
    presses = setup
    from homeassistant.exceptions import ServiceValidationError
    await hass.services.async_call("smart_locker", "assign", {"locker_id": 5, "recipient_id": "r-jean"}, blocking=True)
    pin = hass.states.get("smart_locker.casier_5").attributes["pin_code"]
    await hass.services.async_call("smart_locker", "set_out_of_service", {"locker_id": 5, "out_of_service": True}, blocking=True)
    st = hass.states.get("smart_locker.casier_5")
    assert st.state == "hors_service" and st.attributes["pin_code"] == pin, "contenu conserve"

    # PIN inoperant (rouge), assignation et notification refusees
    hass.bus.async_fire("esphome.keypad_code_entered", {"code": pin}); await hass.async_block_till_done()
    assert not presses
    assert segs(last(aioclient_mock))[5] == ((255, 0, 0), 1)
    for svc, data in (("assign", {"recipient_id": "r-jean"}), ("notify", {})):
        with pytest.raises(ServiceValidationError):
            await hass.services.async_call("smart_locker", svc, {"locker_id": 5, **data}, blocking=True)

    # Rouge fixe une fois le clignotement d'erreur termine
    CLOCK[0] += 4; async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=4)); await hass.async_block_till_done()
    assert segs(last(aioclient_mock))[5] == ((255, 0, 0), 0)

    # Liberer vide le casier mais le laisse hors service
    await hass.services.async_call("smart_locker", "reset", {"locker_id": 5}, blocking=True)
    st = hass.states.get("smart_locker.casier_5")
    assert st.state == "hors_service" and "pin_code" not in st.attributes

    # Remise en service : etat deduit du contenu (vide -> libre)
    await hass.services.async_call("smart_locker", "set_out_of_service", {"locker_id": 5, "out_of_service": False}, blocking=True)
    assert hass.states.get("smart_locker.casier_5").state == "libre"

    # Avec un colis en attente : remis en service -> en attente, PIN de nouveau valide
    await hass.services.async_call("smart_locker", "assign", {"locker_id": 6, "recipient_id": "r-jean"}, blocking=True)
    hass.data["smart_locker"]["lockers"][6].mark_user_notified("r-jean")
    hass.data["smart_locker"]["lockers"][6].notify_sent()
    for flag in (True, False):
        await hass.services.async_call("smart_locker", "set_out_of_service", {"locker_id": 6, "out_of_service": flag}, blocking=True)
    assert hass.states.get("smart_locker.casier_6").state == "en_attente"
    pin6 = hass.states.get("smart_locker.casier_6").attributes["pin_code"]
    hass.bus.async_fire("esphome.keypad_code_entered", {"code": pin6}); await hass.async_block_till_done()
    assert presses[-1].data["entity_id"] == ["button.smart_locker_relais_ouvrir_casier_6"]


async def test_hardware_selection(hass, hass_ws_client, aioclient_mock):
    """Nouvelle instance : entites ESPHome aux noms imprevus, retrouvees par leur nom d'origine."""
    from homeassistant.exceptions import ServiceValidationError
    from homeassistant.helpers import device_registry as dr, entity_registry as er
    presses = async_mock_service(hass, "button", "press")
    dreg, ereg = dr.async_get(hass), er.async_get(hass)
    esp = MockConfigEntry(domain="esphome", title="esphome"); esp.add_to_hass(hass)
    relay = dreg.async_get_or_create(config_entry_id=esp.entry_id, identifiers={("esphome", "relais")},
                                     name="Carte relais neuve")
    keypad = dreg.async_get_or_create(config_entry_id=esp.entry_id, identifiers={("esphome", "digicode")},
                                      name="Digicode neuf")
    for i in (1, 2, 4, 5, 6, 7):  # casier 8 non cable
        b = ereg.async_get_or_create("button", "esphome", f"mac-button-ouvrir_casier_{i}", device_id=relay.id,
                                     original_name=f"Ouvrir casier {i}", suggested_object_id=f"neuve_ouvrir_{i}_2")
        d = ereg.async_get_or_create("binary_sensor", "esphome", f"mac-binary_sensor-porte_casier_{i}",
                                     device_id=relay.id, original_name=f"Porte casier {i}",
                                     suggested_object_id=f"neuve_porte_{i}_2")
        hass.states.async_set(d.entity_id, "off")
    with patch("custom_components.smart_locker._async_setup_frontend"):
        assert await async_setup_component(hass, "smart_locker", {"smart_locker": None})
        await hass.async_block_till_done()
    hass.data["smart_locker"]["recipients"].append({"id": "r", "first_name": "Jean", "last_name": "Dupont"})

    # Detection automatique de la carte relais
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "smart_locker/hardware/status"})
    st = (await asyncio.wait_for(ws.receive_json(), 2))["result"]
    assert st["relay"]["source"] == "auto" and st["relay"]["device_id"] == relay.id
    assert st["relay"]["lockers"]["1"]["button"] == "button.neuve_ouvrir_1_2"
    assert st["relay"]["lockers"]["8"]["button"] is None
    assert {d["name"] for d in st["esphome"]} == {"Carte relais neuve", "Digicode neuf"}
    assert hass.states.get("smart_locker.casier_1").attributes["door_entity"] == "binary_sensor.neuve_porte_1_2"

    # Bon code -> bon bouton ; porte -> recupere
    await hass.services.async_call("smart_locker", "assign", {"locker_id": 1, "recipient_id": "r"}, blocking=True)
    pin = hass.states.get("smart_locker.casier_1").attributes["pin_code"]
    hass.bus.async_fire("esphome.keypad_code_entered", {"code": pin}); await hass.async_block_till_done()
    assert presses[-1].data["entity_id"] == ["button.neuve_ouvrir_1_2"]
    hass.states.async_set("binary_sensor.neuve_porte_1_2", "on"); await hass.async_block_till_done()
    assert hass.states.get("smart_locker.casier_1").state == "récupéré"

    # Casier 8 sans bouton : erreur explicite
    with pytest.raises(ServiceValidationError):
        await hass.services.async_call("smart_locker", "open", {"locker_id": 8}, blocking=True)

    # Entite renommee dans HA : la liaison suit
    ereg.async_update_entity("button.neuve_ouvrir_2_2", new_entity_id="button.renommee")
    await hass.async_block_till_done()
    assert hass.data["smart_locker"]["hardware"].button(2) == "button.renommee"

    # Digicode choisi : les evenements d'un autre appareil sont ignores
    await ws.send_json({"id": 2, "type": "smart_locker/settings/set", "keypad_device_id": keypad.id,
                        "relay_device_id": relay.id})
    assert (await asyncio.wait_for(ws.receive_json(), 2))["success"]
    await hass.services.async_call("smart_locker", "assign", {"locker_id": 4, "recipient_id": "r"}, blocking=True)
    pin4 = hass.states.get("smart_locker.casier_4").attributes["pin_code"]
    n = len(presses)
    hass.bus.async_fire("esphome.keypad_code_entered", {"code": pin4, "device_id": "autre"}); await hass.async_block_till_done()
    assert len(presses) == n
    hass.bus.async_fire("esphome.keypad_code_entered", {"code": pin4, "device_id": keypad.id}); await hass.async_block_till_done()
    assert presses[-1].data["entity_id"] == ["button.neuve_ouvrir_4_2"]
    await ws.send_json({"id": 3, "type": "smart_locker/hardware/status"})
    assert (await asyncio.wait_for(ws.receive_json(), 2))["result"]["relay"]["source"] == "selected"
