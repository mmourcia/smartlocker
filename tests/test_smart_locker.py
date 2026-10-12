"""Tests du composant smart_locker : digicode, eclairage WLED (mocke), parametres."""
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
    with patch("custom_components.smart_locker._async_setup_frontend"), \
         patch("custom_components.smart_locker.leds.time.monotonic", lambda: CLOCK[0]):
        assert await async_setup_component(hass, "smart_locker", {"smart_locker": None})
        await hass.async_block_till_done()
        from custom_components.smart_locker.const import DOMAIN
        hass.data[DOMAIN]["settings"]["led_entry_id"] = entry.entry_id
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
    assert presses[-1].data == {"entity_id": "button.smart_locker_relais_ouvrir_casier_2"}
    assert hass.states.get("smart_locker.casier_2").state == "récupéré"
    s = segs(last(aioclient_mock))
    assert s[2] == ((0, 255, 0), 1) and all(s[i] is None for i in (1, 3, 4, 5, 6, 7, 8))

    # Porte 2 ouverte trop longtemps -> orange clignotant
    hass.states.async_set("binary_sensor.smart_locker_relais_porte_casier_2", "on"); await hass.async_block_till_done()
    CLOCK[0] += 61; async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=70)); await hass.async_block_till_done()
    s = segs(last(aioclient_mock))
    s = segs(last(aioclient_mock))
    assert s[2] == ((255, 110, 0), 1) and s[1] is None, s   # session expiree (30 s) : seule l'alerte reste
    hass.states.async_set("binary_sensor.smart_locker_relais_porte_casier_2", "off"); await hass.async_block_till_done()
    s = segs(last(aioclient_mock))
    assert s[2] == ((0, 255, 0), 0), s   # fermeture = activite recente -> session, casier recupere en vert

    # Fin de session -> extinction
    CLOCK[0] += 31; async_fire_time_changed(hass, dt_util.utcnow() + timedelta(seconds=120)); await hass.async_block_till_done()
    assert last(aioclient_mock) == {"on": False}

async def test_settings_ws(hass, hass_ws_client, setup):
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "smart_locker/leds/devices"})
    r = await ws.receive_json(); assert r["result"][0]["title"] == "WLED-Gledopto"
    await ws.send_json({"id": 2, "type": "smart_locker/settings/set", "led_brightness": 80, "led_timeout": 45})
    r = await ws.receive_json(); assert r["success"] and r["result"]["led_brightness"] == 80 and r["result"]["notification_title"]
    await ws.send_json({"id": 3, "type": "smart_locker/settings/set", "led_brightness": 999})
    r = await ws.receive_json(); assert not r["success"]
    await ws.send_json({"id": 4, "type": "smart_locker/leds/test"})
    r = await ws.receive_json(); assert r["success"]

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

async def test_tag_wakes_leds(hass, aioclient_mock, setup):
    hass.bus.async_fire("tag_scanned", {"tag_id": "1234", "device_id": "x"}); await hass.async_block_till_done()
    assert aioclient_mock.mock_calls[-1][2]["on"] is True
