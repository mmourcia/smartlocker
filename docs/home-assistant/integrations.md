# Home Assistant - Intégrations

## Vue d'ensemble

| Intégration | Protocole | Rôle |
|---|---|---|
| **ESPHome** (carte relais) | WiFi / API native | Commande serrures, lecture reed switches |
| **ESPHome** (digicode) | WiFi / API native | Réception codes PIN saisis |
| **WLED** | WiFi / API JSON + mDNS | Contrôleur des rubans LED (choisi dans la carte Éclairage) |
| **notify.\*** | SMTP / OAuth2 / Push | Notification au destinataire (configurable) |
| **smart_locker** | Custom component | Logique métier, entités casiers, API WebSocket |

---

## ESPHome — Carte relais

L'intégration ESPHome s'ajoute automatiquement dès que l'ESP32 est flashé et joignable.

Entités exposées (N = numéro du casier : 1, 2, 4…8 — la case 3 est le compartiment technique) :

| Entité | Type | Description |
|---|---|---|
| `button.smart_locker_relais_ouvrir_casier_N` | Button | Déclenche l'impulsion relais de 400 ms (ouverture) |
| `switch.smart_locker_relais_relais_casier_N` | Switch | Relais brut — **ne pas utiliser** (pas de limite de durée, le solénoïde grille) |
| `binary_sensor.smart_locker_relais_porte_casier_N` | Binary sensor | État physique de la porte (reed switch) |

---

## ESPHome — Digicode Wiegand

Entités et événements exposés :

| Entité / Événement | Type | Description |
|---|---|---|
| `sensor.smart_locker_digicode_code_pin_digicode` | Text sensor | Dernier code PIN complet saisi |
| `sensor.smart_locker_digicode_badge_rfid` | Text sensor | Dernier badge RFID présenté |
| `esphome.keypad_key_pressed` | Événement | Une touche a été pressée (allume l'éclairage) |
| `esphome.keypad_code_entered` | Événement | PIN de 6 chiffres saisi (validation automatique) |
| `tag_scanned` | Événement | Badge RFID lu (HA convertit `esphome.tag_scanned` en scan de tag natif) |

> Les `text_sensor` ESPHome apparaissent dans le domaine `sensor.` côté Home Assistant.

Le composant `smart_locker` écoute directement les **événements** `esphome.keypad_code_entered`,
`esphome.keypad_key_pressed` et `tag_scanned` — **aucune automatisation manuelle n'est
nécessaire**. Écouter l'événement plutôt que le capteur garantit qu'un même PIN saisi deux fois de
suite est bien traité deux fois.

> L'ancienne option `pin_sensor` de `configuration.yaml` est obsolète : elle est ignorée (avec un
> avertissement dans les logs) et peut être retirée.

---

## WLED — Gledopto

Le contrôleur est ajouté par découverte automatique (intégration **WLED**). Le composant n'utilise
pas ses entités `light.*` : il récupère l'adresse IP dans l'entrée d'intégration choisie dans la
carte **Éclairage**, puis pilote les 8 segments en une requête `POST /json/state`.

Segments, câblage et code couleur : [Éclairage WLED](../hardware/wled-gledopto.md).

---

## Notifications

La notification est déclenchée par le bouton **Notifier** de la carte Lovelace.
Les services utilisés sont configurés **par destinataire** dans la carte Destinataires — aucune
clé globale dans `configuration.yaml`.

### Services supportés

| Service | Configuration | Nom dans HA |
|---|---|---|
| SMTP (Gmail, OVH…) | Bloc `notify:` dans `configuration.yaml` | nom du bloc (ex : `smtp_pharmacie`) |
| Google Mail | Intégration UI — Paramètres › Appareils | `google_mail` |
| Application mobile | Companion App installée sur le téléphone | `mobile_app_<appareil>` |
| SMS SMSFactor | Bloc `notify:` REST dans `configuration.yaml` | `smsfactor` (nom du bloc) |

### Sélection automatique de la cible (`target`)

Le composant détecte le type de service à partir de son nom :

- Nom contenant `smtp`, `mail`, `gmail`, `imap` ou `email` → **service email**
  - `target` = adresse email du destinataire
  - Corps : version HTML avec PIN en grand
- Autre nom → **service mobile/SMS**
  - `target` = numéro de téléphone du destinataire

Si le champ requis (email ou mobile) est vide pour un destinataire, le service est ignoré avec
un avertissement dans les logs HA.

Un destinataire peut avoir plusieurs services cochés (ex : email + SMS) — les deux sont envoyés.
Un destinataire déjà notifié est ignoré si le bouton **Notifier** est rappuyé ; il redevient
notifiable après un **Libérer**.

### Contenu de la notification

- **Objet** : paramétrable depuis la carte Destinataires (défaut : *"Colis mis à disposition à la pharmacie"*)
- **Corps** : prénom du destinataire + numéro de casier + code PIN formaté (`XXX-XXX`)
- **Corps email** : version HTML avec le PIN affiché en grand

---

## Composant smart_locker

### Entités

| Entité | Type | Attributs |
|---|---|---|
| `smart_locker.casier_N` (N = 1, 2, 4…8) | Entity | `state`, `assigned_users`, `pin_code`, `retrieved_at`, `notified_at`, `locker_id` |

- `notified_at` : dictionnaire `{ "Prénom Nom": "DD/MM HH:MM" }` — présent uniquement si au moins un utilisateur a été notifié. Remis à vide au `reset`.

### États métier

| Valeur | Signification |
|---|---|
| `libre` | Casier disponible |
| `occupé` | Destinataire(s) assigné(s), PIN généré |
| `en_attente` | Notification envoyée, colis attendu |
| `récupéré` | Colis récupéré (via digicode ou bouton Ouvrir) |
| `hors_service` | Casier indisponible |

`locker_id` accepte 1, 2, 4, 5, 6, 7 ou 8 ; le 3 est refusé (compartiment technique).

### Ouverture par digicode

À chaque événement `esphome.keypad_code_entered`, le composant cherche un casier `occupé` ou
`en_attente` dont le PIN correspond :

- **trouvé** : appui sur `button.smart_locker_relais_ouvrir_casier_N`, casier en `récupéré`, LED
  du casier en vert clignotant (les autres éteintes) ;
- **non trouvé** : avertissement dans les logs, tous les casiers clignotent en rouge 3 s.

### Éclairage

Logique dans `leds.py` (classe `LedController`). Résumé :

| Déclencheur | Effet |
|---|---|
| Touche digicode, badge, ouverture/fermeture de porte | Allume l'éclairage pour `led_timeout` s (prolongé à chaque activité) |
| Changement d'état d'un casier (dashboard) | Mise à jour des couleurs si l'éclairage est allumé |
| Bon PIN / bouton **Ouvrir** | Casier concerné en vert clignotant 8 s, autres éteints |
| Mauvais PIN | Tous les casiers en rouge clignotant 3 s |
| Porte ouverte plus de `door_alert_delay` s | Casier en orange clignotant jusqu'à fermeture, même hors activité |

Code couleur détaillé : [Éclairage WLED](../hardware/wled-gledopto.md#code-couleur).

### Services exposés

| Service | Paramètres | Effet |
|---|---|---|
| `smart_locker.assign` | `locker_id`, `user` (« Prénom Nom ») | Assigne un destinataire, génère le PIN |
| `smart_locker.unassign` | `locker_id`, `user` | Retire un destinataire |
| `smart_locker.notify` | `locker_id` | Envoie la notification avec PIN |
| `smart_locker.open` | `locker_id` | Ouvre le casier (impulsion relais), passe en `récupéré` |
| `smart_locker.reset` | `locker_id` | Remet à libre, efface PIN et assignations |

### Stockage persistant

Les données sont stockées dans `.storage/smart_locker_recipients` (JSON, géré par HA Store) :

```json
{
  "recipients": [
    {
      "id": "uuid",
      "first_name": "Jean",
      "last_name": "Dupont",
      "mobile": "0612345678",
      "email": "jean.dupont@example.com",
      "notify_services": ["smtp_pharmacie", "smsfactor"]
    }
  ],
  "settings": {
    "notification_title": "Colis mis à disposition à la pharmacie",
    "led_entry_id": "01J…",
    "led_brightness": 190,
    "led_timeout": 30,
    "door_alert_delay": 60
  }
}
```

Les états des casiers (PIN, assignations, état) sont en mémoire et réinitialisés au redémarrage de HA.
Pour une persistance des états entre redémarrages, voir la [roadmap](../../README.md#roadmap).

### API WebSocket (usage interne cartes Lovelace)

| Commande | Description |
|---|---|
| `smart_locker/recipients/list` | Liste des destinataires |
| `smart_locker/recipients/add` | Ajouter un destinataire |
| `smart_locker/recipients/update` | Modifier un destinataire |
| `smart_locker/recipients/delete` | Supprimer un destinataire |
| `smart_locker/settings/get` | Lire les paramètres |
| `smart_locker/settings/set` | Modifier les paramètres (chaque clé est optionnelle) |
| `smart_locker/leds/devices` | Lister les contrôleurs WLED de HA (`entry_id`, `title`, `host`) |
| `smart_locker/leds/test` | Simuler une activité (allume l'éclairage) |

### Paramètres

| Clé | Défaut | Description |
|---|---|---|
| `notification_title` | *Colis mis à disposition à la pharmacie* | Objet des notifications |
| `led_entry_id` | *(vide)* | Entrée de l'intégration WLED à piloter ; vide = LED désactivées |
| `led_brightness` | 190 | Luminosité globale WLED (1-255) |
| `led_timeout` | 30 | Secondes d'éclairage après la dernière activité (5-3600) |
| `door_alert_delay` | 60 | Secondes de porte ouverte avant alerte orange (5-3600) |
