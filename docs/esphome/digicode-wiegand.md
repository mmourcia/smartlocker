# ESPHome - Digicode Wiegand

<img src="../../docs/img/digicode.jpg" width="400"/>

Référence : [composant wiegand ESPHome](https://esphome.io/components/wiegand/)

Le digicode se connecte à un ESP32 dédié via deux fils data (D0 et D1). L'ESP32 décode les touches
et les assemble en code PIN via le composant `key_collector`, puis transmet le code complet à
Home Assistant.

---

## Mise en mode Wiegand 26

Ce digicode peut fonctionner en WG26 ou WG34. Par défaut il sort du WG26, mais si le mode
a été changé, la séquence suivante le remet en WG26 :

```
* 123456 # 0 31 #
```

(`123456` est le code de programmation par défaut. Le `0 31` sélectionne le mode WG26.)

---

## Câblage

Les lignes D0/D1 du digicode sont en logique **5V**. L'ESP32 ne tolère que 3.3V en entrée :
il faut un diviseur de tension sur chaque ligne.

```
D0 (5V) ── R1 1kΩ ──┬── GPIO14
                     │
                    R2 2kΩ
                     │
                    GND
```

Même montage pour D1/GPIO27. Le diviseur ramène le 5V à 3.3V sans déformer les pulses
Wiegand (~50µs).

| Digicode | Câblage intermédiaire | ESP32 |
|---|---|---|
| VCC | - | 12V |
| GND | GND commun | GND |
| D0 | Diviseur 1kΩ/2kΩ | GPIO14 |
| D1 | Diviseur 1kΩ/2kΩ | GPIO27 |

---

## Configuration ESPHome

Le composant `wiegand` capture chaque touche via `on_key`. Le composant `key_collector` les
assemble en séquence et déclenche l'envoi à Home Assistant quand l'utilisateur appuie sur `#`.
La touche `*` efface la saisie en cours.

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
  level: INFO
  # Ne pas logger les codes PIN en production

api:
  encryption:
    key: !secret api_encryption_key
ota:
  password: !secret ota_password
wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

# Wiegand - gere les touches clavier et les badges RFID

wiegand:
  - id: keypad
    d0: GPIO14
    d1: GPIO27
    on_tag:
      # Badge RFID -> ID transmis directement a Home Assistant (x est deja un std::string)
      - text_sensor.template.publish:
          id: tag_id
          state: !lambda 'return x;'
      - homeassistant.event:
          event: esphome.tag_scanned
          data:
            tag_id: !lambda 'return x;'

# key_collector se branche sur le wiegand via source_id - pas besoin de on_key

key_collector:
  - id: pin_collector
    source_id: keypad
    min_length: 4
    max_length: 8
    end_keys: "#"
    back_keys: "*"
    timeout: 10s
    on_result:
      - text_sensor.template.publish:
          id: pin_code
          state: !lambda 'return x;'
      - homeassistant.event:
          event: esphome.keypad_code_entered
          data:
            code: !lambda 'return x;'
    on_timeout:
      - text_sensor.template.publish:
          id: pin_code
          state: ""

# Capteurs exposes dans Home Assistant

text_sensor:
  - platform: template
    name: "Code PIN digicode"
    id: pin_code
    icon: "mdi:dialpad"
  - platform: template
    name: "Badge RFID"
    id: tag_id
    icon: "mdi:card-account-details"
```

### Touches speciales

| Valeur Wiegand | Touche physique | Role dans key_collector |
|---|---|---|
| 0-9 | Chiffres | Saisie du code |
| 10 | `*` | Efface la saisie en cours |
| 11 | `#` | Valide et envoie le code |

---

## Cote Home Assistant

Deux evenements sont fires selon le mode d'authentification :

| Evenement | Champ data | Declencheur |
|---|---|---|
| `esphome.keypad_code_entered` | `code` | Utilisateur valide son PIN avec `#` |
| `esphome.tag_scanned` | `tag_id` | Badge RFID presente devant le lecteur |

Exemple d'automatisation :

```yaml
alias: "Digicode - code PIN ou badge RFID"
trigger:
  - platform: event
    event_type: esphome.keypad_code_entered
    id: pin
  - platform: event
    event_type: esphome.tag_scanned
    id: badge
action:
  - variables:
      identifiant: >
        {% if trigger.id == 'pin' %}
          {{ trigger.event.data.code }}
        {% else %}
          {{ trigger.event.data.tag_id }}
        {% endif %}
  # Verification de l'identifiant et ouverture du casier correspondant
```

> Relever l'ID d'un badge en le presentant devant le lecteur et en consultant
> les logs ESPHome ou l'etat de l'entite `text_sensor.badge_rfid` dans HA.

---

## Notes

- Le digicode doit etre en mode WG26 pour que le composant ESPHome fonctionne. Sequence de
  programmation : `* 123456 # 0 31 #` (voir section ci-dessus).
- Éviter GPIO0, GPIO2, GPIO5, GPIO12, GPIO15 (strapping pins au boot) et GPIO34-39 (input
  only, pas de pull-up interne). GPIO14 et GPIO27 sont des choix surs.
- Les lignes D0/D1 etant en 5V, le diviseur de tension 1kΩ/2kΩ est obligatoire pour
  proteger les GPIO de l'ESP32 (3.3V max).
- L'ID de badge est transmis sous forme de chaine dans `x`. Pour l'afficher en hexadecimal :
  `return str_sprintf("%llX", atoll(x.c_str()));`
- Les `text_sensor` publient les donnees en clair dans Home Assistant. Prevoir de les effacer
  apres traitement (publier une chaine vide).
