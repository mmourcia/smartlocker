# Home Assistant - Intégrations

## Vue d'ensemble

| Intégration | Protocole | Rôle |
|---|---|---|
| **ESPHome** (carte relais) | WiFi / API native | Commande serrures, lecture reed switches |
| **ESPHome** (digicode) | WiFi / API native | Réception codes PIN saisis |
| **WLED** | WiFi / API REST + mDNS | Pilotage anneaux LED par casier |
| **notify.\*** | SMTP / OAuth2 / Push | Notification au destinataire (configurable) |
| **smart_locker** | Custom component | Logique métier, entités casiers, API WebSocket |

---

## ESPHome — Carte relais

L'intégration ESPHome s'ajoute automatiquement dès que l'ESP32 est flashé et joignable.

Entités exposées (N = numéro du casier, 1 à 8) :

| Entité | Type | Description |
|---|---|---|
| `button.smart_locker_relais_ouvrir_casier_N` | Button | Déclenche l'impulsion relais (ouverture) |
| `binary_sensor.smart_locker_relais_porte_casier_N` | Binary sensor | État physique de la porte (reed switch) |

---

## ESPHome — Digicode Wiegand

Entités et événements exposés :

| Entité / Événement | Type | Description |
|---|---|---|
| `sensor.smart_locker_digicode_code_pin_digicode` | Text sensor | Dernier code PIN complet saisi (effacé après traitement) |
| `text_sensor.smart_locker_digicode_badge_rfid` | Text sensor | Dernier badge RFID présenté |
| `esphome.keypad_code_entered` | Événement | Code validé avec `#` |
| `esphome.tag_scanned` | Événement | Badge RFID lu |

Le composant `smart_locker` écoute directement `sensor.smart_locker_digicode_code_pin_digicode`
via `async_track_state_change_event` — **aucune automatisation manuelle n'est nécessaire**.

Le capteur par défaut peut être surchargé dans `configuration.yaml` :
```yaml
smart_locker:
  pin_sensor: sensor.smart_locker_digicode_code_pin_digicode
```

---

## WLED — Gledopto

Après découverte automatique, Home Assistant génère :

| Entité | Type | Description |
|---|---|---|
| `light.wled_smartlocker` | Light | Contrôle global |
| `light.wled_casiers_1_2` | Light | Segment voie 1 |
| `light.wled_casiers_3_4` | Light | Segment voie 2 |
| `light.wled_casiers_5_6` | Light | Segment voie 3 |
| `light.wled_casiers_7_8` | Light | Segment voie 4 |

---

## Notifications

La notification est déclenchée par le bouton **Notifier** de la carte Lovelace.
Elle passe par le service HA configuré dans `configuration.yaml` (`notify_service`).

### Services supportés

| Service | Configuration | `notify_service` |
|---|---|---|
| SMTP (Gmail, OVH…) | `notify:` dans `configuration.yaml` — voir [dashboard.md](dashboard.md) | `smtp_pharmacie` (nom du bloc) |
| Google Mail | Intégration UI — Paramètres › Appareils | `google_mail` |
| Application mobile | Companion App installée sur le téléphone | `mobile_app_<appareil>` |

Le service reçoit automatiquement `target: [email]` si le destinataire a un email renseigné.
Sans email (ex : service mobile), le message est envoyé sans `target` (l'appareil est déterminé par le nom du service).

### Contenu de la notification

- **Objet** : paramétrable depuis la carte Destinataires (défaut : *"Colis mis à disposition à la pharmacie"*)
- **Corps** : prénom du destinataire + numéro de casier + code PIN formaté (`XXX-XXX`)
- **Corps email** : version HTML avec le PIN affiché en grand

---

## Composant smart_locker

### Entités

| Entité | Type | Attributs |
|---|---|---|
| `smart_locker.casier_N` | Entity | `state`, `assigned_users`, `pin_code`, `retrieved_at`, `locker_id` |

### États métier

| Valeur | Signification |
|---|---|
| `libre` | Casier disponible |
| `occupé` | Destinataire(s) assigné(s), PIN généré |
| `en_attente` | Notification envoyée, colis attendu |
| `récupéré` | Colis récupéré (via digicode ou bouton Ouvrir) |
| `hors_service` | Casier indisponible |

### Services exposés

| Service | Paramètres | Effet |
|---|---|---|
| `smart_locker.assign` | `locker_id`, `user` | Assigne un destinataire, génère le PIN |
| `smart_locker.unassign` | `locker_id`, `user` | Retire un destinataire |
| `smart_locker.notify` | `locker_id` | Envoie la notification avec PIN |
| `smart_locker.open` | `locker_id` | Ouvre le casier (impulsion relais) |
| `smart_locker.reset` | `locker_id` | Remet à libre, efface PIN et assignations |

### Stockage persistant

Les données sont stockées dans `.storage/smart_locker_recipients` (JSON, géré par HA Store) :

```json
{
  "recipients": [
    { "id": "uuid", "first_name": "Jean", "last_name": "Dupont",
      "mobile": "0612345678", "email": "jean.dupont@example.com" }
  ],
  "settings": {
    "notification_title": "Colis mis à disposition à la pharmacie"
  }
}
```

Les états des casiers (PIN, assignations, état) sont en mémoire et réinitialisés au redémarrage de HA.
Pour une persistance des états entre redémarrages, voir les évolutions possibles en section [Roadmap](../../README.md).

### API WebSocket (usage interne cartes Lovelace)

| Commande | Description |
|---|---|
| `smart_locker/recipients/list` | Liste des destinataires |
| `smart_locker/recipients/add` | Ajouter un destinataire |
| `smart_locker/recipients/update` | Modifier un destinataire |
| `smart_locker/recipients/delete` | Supprimer un destinataire |
| `smart_locker/settings/get` | Lire les paramètres |
| `smart_locker/settings/set` | Modifier les paramètres |
