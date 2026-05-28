# ESPHome - Digicode Wiegand 26

## Présentation

Le digicode utilise le protocole **Wiegand 26**, standard de l'industrie du contrôle d'accès.
Il se connecte à un ESP32 dédié (séparé de la carte relais) via 3 fils : DATA0, DATA1, et GND.

La saisie du code PIN est traitée dans Home Assistant via l'intégration ESPHome : l'ESP32 transmet
le code saisi, HA vérifie s'il correspond à un utilisateur connu et déclenche l'ouverture du casier
associé.

## Protocole Wiegand 26

Le protocole Wiegand 26 encode 26 bits sur 2 lignes data :
- **DATA0** : impulsion si bit = 0
- **DATA1** : impulsion si bit = 1
- Les 2 lignes sont normalement HIGH (idle)
- Durée bit : ~50 µs ; intervalle entre bits : ~1 ms

Pour un clavier PIN, chaque touche génère un code sur ces lignes. Le composant ESPHome
`wiegand` s'occupe de tout le décodage.

## Câblage

```
Digicode              ESP32 (dédié)
─────────             ─────────────
+12V  ──────────────  VIN (via régulateur)
GND   ──────────────  GND
DATA0 ──────────────  GPIO_D0  (ex. GPIO4)
DATA1 ──────────────  GPIO_D1  (ex. GPIO5)
```

> Certains digicodes acceptent du 5V ou 12V. Vérifier la datasheet du modèle utilisé.
> Les lignes DATA fonctionnent en 5V logique - vérifier la compatibilité avec l'ESP32 (3.3V).
> Si incompatible, utiliser un diviseur de tension ou un level-shifter.

## Configuration ESPHome

```yaml
# smartlocker-digicode.yaml
substitutions:
  device_name: smartlocker-digicode
  friendly_name: "Smart Locker - Digicode"

esphome:
  name: ${device_name}
  friendly_name: ${friendly_name}

esp32:
  board: esp32dev
  framework:
    type: arduino

logger:
api:
  encryption:
    key: !secret api_encryption_key
ota:
  password: !secret ota_password
wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

wiegand:
  - id: keypad
    d0: GPIO4
    d1: GPIO5
    on_key:
      - lambda: |-
          ESP_LOGI("wiegand", "Touche: %d", x);
    on_tag:
      - lambda: |-
          ESP_LOGI("wiegand", "Code saisi: %s", x.c_str());
      - homeassistant.event:
          event: esphome.keypad_code_entered
          data:
            code: !lambda 'return x;'
    on_tag_removed:
      - logger.log: "Fin de saisie"
```

### Variante avec text_sensor (code transmis comme entité HA)

```yaml
text_sensor:
  - platform: template
    name: "Code digicode"
    id: keypad_code
    icon: "mdi:dialpad"

wiegand:
  - id: keypad
    d0: GPIO4
    d1: GPIO5
    on_tag:
      - text_sensor.template.publish:
          id: keypad_code
          state: !lambda 'return x;'
      - homeassistant.event:
          event: esphome.keypad_code_entered
          data:
            code: !lambda 'return x;'
```

## Intégration côté Home Assistant

### Automatisation de vérification du code

```yaml
# automations.yaml
alias: "Digicode - Vérification code PIN"
trigger:
  - platform: event
    event_type: esphome.keypad_code_entered
condition: []
action:
  - variables:
      code_saisi: "{{ trigger.event.data.code }}"
  - choose:
      # Itérer sur les utilisateurs et leurs codes PIN (stockés en helpers)
      - conditions:
          - condition: template
            value_template: >
              {% for i in range(1, 9) %}
                {% if states('input_text.casier_' ~ i ~ '_destinataire') != '' %}
                  {% if code_saisi == states('input_text.user_' ~ 
                      states('input_text.casier_' ~ i ~ '_destinataire') ~ '_pin') %}
                    true
                  {% endif %}
                {% endif %}
              {% endfor %}
        sequence:
          - service: button.press
            target:
              entity_id: >
                {# Trouver le casier correspondant à l'utilisateur #}
                button.ouvrir_casier_{{ casier_id }}
    default:
      - service: homeassistant.event
        data:
          event_type: esphome.keypad_code_rejected
```

> La logique de vérification gagne à être déléguée à un **backend Python** pour plus de clarté
> et de maintenabilité. Voir [backend/README.md](../backend/README.md).

## Retour visuel après saisie

Le digicode peut disposer d'un buzzer ou d'une LED intégrés (selon le modèle). ESPHome peut
piloter ces sorties depuis Home Assistant pour confirmer ou rejeter la saisie :

```yaml
# Sur l'ESP32 digicode
output:
  - platform: gpio
    pin: GPIO18
    id: buzzer

on_tag:
  - homeassistant.event:
      event: esphome.keypad_code_entered
      data:
        code: !lambda 'return x;'
  # Bip court de confirmation de réception
  - output.turn_on: buzzer
  - delay: 100ms
  - output.turn_off: buzzer
```

## Notes

- La plupart des digicodes Wiegand 26 transmettent 4 à 8 chiffres comme un "tag" unique.
- Le composant ESPHome `wiegand` gère aussi Wiegand 34 et les badges RFID - utile pour
  une évolution vers un système badge + PIN.
- Ne pas stocker les codes PIN en clair dans les logs - désactiver `on_key` en production.
