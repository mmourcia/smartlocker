# Home Assistant - Intégrations

## Vue d'ensemble

| Intégration | Protocole | Rôle |
|---|---|---|
| **ESPHome** (relais) | WiFi / API native | Commande serrures, lecture reed switches |
| **ESPHome** (digicode) | WiFi / API native | Réception codes PIN saisis |
| **WLED** | WiFi / API REST + mDNS | Pilotage anneaux LED par casier |
| **MQTT** | TCP/IP | Optionnel - bus événements entre composants |
| **notify.smtp** | SMTP | Email de notification au destinataire |

## ESPHome - Carte relais

L'intégration ESPHome s'ajoute automatiquement dès que l'ESP32 est flashé et joignable sur le réseau.

Entités exposées par la carte relais :

| Entité | Type | Description |
|---|---|---|
| `button.ouvrir_casier_N` | Button | Déclenche l'impulsion relais |
| `binary_sensor.porte_casier_N` | Binary sensor | État physique de la porte (reed switch) |

## ESPHome - Digicode

Entités / événements exposés :

| Entité / Événement | Type | Description |
|---|---|---|
| `text_sensor.code_digicode` | Text sensor | Dernier code saisi (effacé après traitement) |
| `esphome.keypad_code_entered` | Event | Code saisi, déclenche la vérification dans HA |

## WLED - Gledopto

Après découverte automatique, Home Assistant génère :

| Entité | Type | Description |
|---|---|---|
| `light.wled_smartlocker` | Light | Contrôle global |
| `light.wled_casiers_1_2` | Light | Segment voie 1 |
| `light.wled_casiers_3_4` | Light | Segment voie 2 |
| `light.wled_casiers_5_6` | Light | Segment voie 3 |
| `light.wled_casiers_7_8` | Light | Segment voie 4 |

## Helpers (input_*)

Les états métier des casiers et les données utilisateurs sont stockés dans des helpers HA :

### État des casiers

```yaml
# configuration.yaml ou via UI : Paramètres > Appareils > Helpers
input_select:
  casier_1_etat:
    name: "État casier 1"
    options: [libre, occupé, en_attente, ouvert]
    initial: libre
  # ... répéter pour casiers 2 à 8
```

### Destinataires et PIN

```yaml
input_text:
  casier_1_destinataire:
    name: "Destinataire casier 1"
    max: 50

input_text:
  user_alice_pin:
    name: "PIN Alice"
    max: 8
    mode: password   # masqué dans l'UI
  user_bob_pin:
    name: "PIN Bob"
    max: 8
    mode: password
```

> Les PIN en mode `password` sont masqués dans Lovelace mais stockés en clair dans le fichier
> d'état HA. Pour la V1 (usage interne réseau local), c'est acceptable. Une V2 pourrait
> déléguer la vérification au backend Python avec des hash bcrypt.

## Automatisations principales

| Automatisation | Déclencheur | Action |
|---|---|---|
| Vérification code PIN | `esphome.keypad_code_entered` | Identifier casier/user, ouvrir si OK, LED feedback |
| Détection porte ouverte | `binary_sensor.porte_casier_N` → ON | Passer casier en état `ouvert`, LED blanc clignotant |
| Détection porte refermée | `binary_sensor.porte_casier_N` → OFF + état `ouvert` | Passer casier en état `libre`, LED vert |
| Notification dépôt | Changement état `libre` → `occupé` | Email au destinataire désigné |
| LED par état | Changement `input_select.casier_N_etat` | Appel service `light.turn_on` sur segment WLED |

## Mise à jour du README principal

Penser à mettre à jour le tableau "Couche logicielle" dans [README.md](../../README.md)
quand de nouvelles intégrations sont ajoutées (WLED, backend Python...).
