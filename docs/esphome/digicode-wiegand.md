# ESPHome - Digicode Wiegand

<img src="../../docs/img/digicode.jpg" width="400"/>

Référence : [composant wiegand ESPHome](https://esphome.io/components/wiegand/)

Le digicode se connecte à un ESP32 dédié via deux fils data (D0 et D1). L'ESP32 décode les touches
et les assemble en code PIN via le composant `key_collector`, puis transmet le code complet à
Home Assistant dès le **6e chiffre** saisi (les PIN générés par le composant `smart_locker` font
toujours 6 chiffres).

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

Les lignes D0/D1 du digicode sont en logique 5V. En pratique, l'ESP32 encaisse ce niveau
sans problème sur GPIO14 et GPIO27 — aucun diviseur de tension n'est nécessaire.

| Digicode | ESP32 |
|---|---|
| VCC | 12V |
| GND | GND commun |
| D0 | GPIO14 |
| D1 | GPIO27 |

---

## Configuration ESPHome

Fichier de référence : [`esphome/smartlocker-digicode.yaml`](../../esphome/smartlocker-digicode.yaml)
(secrets : voir [`esphome/secrets.yaml.example`](../../esphome/secrets.yaml.example)).

Le composant `wiegand` reçoit les touches et les badges. Le `key_collector` s'y branche via
`source_id` (pas besoin de `on_key`) :

```yaml
key_collector:
  - id: pin_collector
    source_id: keypad
    min_length: 6
    max_length: 6
    end_key_required: false
    # end_keys: "#"   # a remettre si la validation apres 6 chiffres pose probleme
    back_keys: "*"
    timeout: 10s
    # Chaque touche reveille l'eclairage des casiers (composant smart_locker)
    on_progress:
      - homeassistant.event:
          event: esphome.keypad_key_pressed
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
```

| Paramètre | Valeur | Effet |
|---|---|---|
| `min_length` / `max_length` | 6 / 6 | Le code est envoyé automatiquement au 6e chiffre |
| `end_key_required` | `false` | Pas besoin de valider avec `#` |
| `back_keys` | `*` | Efface le dernier chiffre saisi |
| `timeout` | 10 s | Saisie partielle abandonnée après 10 s d'inactivité, capteur remis à vide |
| `on_progress` | événement | `esphome.keypad_key_pressed` à chaque touche : allume l'éclairage |

Le badge RFID passe par `on_tag` du composant `wiegand` : publication dans le capteur
« Badge RFID » et événement `esphome.tag_scanned` (reçu côté HA comme `tag_scanned`, voir plus bas).

### Touches speciales

| Valeur Wiegand | Touche physique | Role dans key_collector |
|---|---|---|
| 0-9 | Chiffres | Saisie du code |
| 10 | `*` | Efface le dernier chiffre |
| 11 | `#` | Ignorée (sauf si `end_keys: "#"` est réactivé) |

---

## Cote Home Assistant

Trois evenements sont emis :

| Evenement | Champ data | Declencheur |
|---|---|---|
| `esphome.keypad_key_pressed` | - | Chaque touche pressee |
| `esphome.keypad_code_entered` | `code` | 6e chiffre du PIN saisi |
| `tag_scanned` | `tag_id`, `device_id` | Badge RFID presente devant le lecteur |

> Home Assistant intercepte `esphome.tag_scanned` et le transforme en **scan de tag natif** : le
> badge apparaît dans *Paramètres › Tags* et l'événement émis sur le bus est `tag_scanned`, pas
> `esphome.tag_scanned`. Les automatisations doivent donc écouter `tag_scanned` (ou utiliser le
> déclencheur *Tag*).

Le composant `smart_locker` écoute directement ces événements : **aucune automatisation n'est
nécessaire** pour ouvrir un casier au bon PIN ni pour allumer l'éclairage. Les événements restent
disponibles pour d'autres usages, par exemple :

```yaml
alias: "Digicode - code PIN ou badge RFID"
trigger:
  - platform: event
    event_type: esphome.keypad_code_entered
    id: pin
  - platform: event
    event_type: tag_scanned
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
> les logs ESPHome ou l'etat de l'entite `sensor.smart_locker_digicode_badge_rfid` dans HA.

---

## Notes

- Le digicode doit etre en mode WG26 pour que le composant ESPHome fonctionne. Sequence de
  programmation : `* 123456 # 0 31 #` (voir section ci-dessus).
- Éviter GPIO0, GPIO2, GPIO5, GPIO12, GPIO15 (strapping pins au boot) et GPIO34-39 (input
  only, pas de pull-up interne). GPIO14 et GPIO27 sont des choix surs.
- L'ID de badge est transmis sous forme de chaine dans `x`. Pour l'afficher en hexadecimal :
  `return str_sprintf("%llX", atoll(x.c_str()));`
- Les `text_sensor` publient les donnees en clair dans Home Assistant. Le `on_timeout` ne remet
  le capteur a vide que sur une saisie **abandonnee** : apres un code complet, le capteur conserve
  le dernier PIN saisi.
- Le logger est actuellement en `VERBOSE` (mise au point) : les codes PIN apparaissent dans les
  logs ESPHome. Repasser en `INFO` en production.
- Le composant `smart_locker` ecoute l'evenement et non le capteur : un meme PIN saisi deux fois
  de suite est bien traite deux fois.
- Les evenements `esphome.*` emis par un appareil ESPHome ne necessitent pas l'option *Autoriser
  l'appareil a effectuer des actions Home Assistant*.
