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

Les identifiants ci-dessus sont ceux générés par défaut. **Le composant ne s'y fie pas** : il
retrouve les entités sur l'appareil ESPHome de la carte relais d'après leur **nom d'origine**
(« Ouvrir casier N », « Porte casier N »). Un suffixe ajouté par HA (`_2`…) ou un renommage dans HA
ne casse donc pas la liaison. Ordre de résolution :

1. l'appareil choisi dans la carte **Matériel** ;
2. à défaut, **détection automatique** : l'appareil ESPHome qui porte le plus de ces entités ;
3. à défaut, les identifiants par défaut ci-dessus (installations antérieures à la v0.8.0).

La liaison est recalculée quand on change d'appareil et quand une entité ESPHome est ajoutée ou
modifiée. La carte **Matériel** affiche le résultat casier par casier ; un casier sans bouton
d'ouverture est signalé dans les journaux et le bouton **Ouvrir** renvoie une erreur explicite.

---

## ESPHome — Digicode Wiegand

Entités et événements exposés :

| Entité / Événement | Type | Description |
|---|---|---|
| `sensor.smart_locker_digicode_code_pin_digicode` | Text sensor | Dernier code PIN complet saisi |
| `sensor.smart_locker_digicode_badge_rfid` | Text sensor | Dernier badge RFID présenté |
| `esphome.keypad_key_pressed` | Événement | Une touche a été pressée (allume l'éclairage) |
| `esphome.keypad_code_entered` | Événement | PIN de 6 chiffres saisi (validation automatique) |
| `esphome.keypad_timeout` | Événement | Saisie abandonnée (traitée comme un mauvais code) |
| `esphome.badge_scanned` | Événement | Badge RFID lu par le lecteur du meuble |

> Les `text_sensor` ESPHome apparaissent dans le domaine `sensor.` côté Home Assistant.

Le composant `smart_locker` écoute directement les **événements** `esphome.keypad_code_entered`,
`esphome.keypad_key_pressed`, `esphome.keypad_timeout` et `esphome.badge_scanned` — **aucune automatisation manuelle n'est
nécessaire**. Écouter l'événement plutôt que le capteur garantit qu'un même PIN saisi deux fois de
suite est bien traité deux fois.

Si un digicode est choisi dans la carte **Matériel**, seuls ses événements sont pris en compte
(champ `device_id` ajouté par HA à chaque événement ESPHome). Sans choix, tous les appareils ESPHome
sont écoutés.

> L'ancienne option `pin_sensor` de `configuration.yaml` est obsolète : elle est ignorée (avec un
> avertissement dans les logs) et peut être retirée.

---

## WLED — Gledopto

Le contrôleur est ajouté par découverte automatique (intégration **WLED**). Le composant n'utilise
pas ses entités `light.*` : il récupère l'adresse IP dans l'entrée d'intégration choisie dans la
carte **Matériel**, puis pilote les 8 segments en une requête `POST /json/state`.

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
notifiable après la libération du casier.

### Contenu de la notification

Titre, texte et HTML de l'email sont des templates éditables dans la carte **Messages**. Contenu entièrement personnalisable par templates, voir [Messages](#messages).

---

## Composant smart_locker

### Entités

| Entité | Type | Attributs |
|---|---|---|
| `smart_locker.casier_N` (N = 1, 2, 4…8) | Entity | `state`, `assigned_recipients`, `assigned_users`, `pin_code`, `retrieved_at`, `notified_at`, `locker_id` |

- `assigned_recipients` : `[{"id": "…", "name": "Prénom Nom", "notified_at": "DD/MM HH:MM" | null}]`.
  Les destinataires sont référencés par leur **id** : renommer quelqu'un met à jour le nom affiché
  sans casser l'assignation. Un destinataire supprimé apparaît comme *Destinataire supprimé*.
- `assigned_users` et `notified_at` (`{ "Prénom Nom": "DD/MM HH:MM" }`) : noms affichés, conservés pour
  compatibilité avec d'éventuelles automatisations.

### États métier

| Valeur | Signification |
|---|---|
| `libre` | Casier disponible |
| `occupé` | Destinataire(s) assigné(s), PIN généré |
| `en_attente` | Notification envoyée, colis attendu |
| `récupéré` | Porte ouverte après un bon PIN / badge ; le casier repasse `libre` à la fermeture |
| `hors_service` | Casier indisponible (serrure en panne…) : rouge fixe, PIN et badge inopérants, assignation et notification refusées |

`locker_id` accepte 1, 2, 4, 5, 6, 7 ou 8 ; le 3 est refusé (compartiment technique).

### Ouverture par digicode

À chaque événement `esphome.keypad_code_entered`, le composant cherche un casier `occupé` ou
`en_attente` dont le PIN correspond :

- **trouvé** : appui sur le bouton « Ouvrir casier N » de la carte relais, LED du casier en vert
  clignotant (les autres éteintes). Voir [cycle de récupération](#cycle-de-récupération) ;
- **non trouvé** : avertissement dans les logs, tous les casiers clignotent en rouge 3 s.

Une saisie abandonnée (`esphome.keypad_timeout`) produit le même clignotement rouge.

### Cycle de récupération

Le reed switch confirme la récupération :

1. Bon PIN ou badge → impulsion relais. L'état ne change pas encore.
2. La porte s'ouvre dans les **30 s** → casier `récupéré`, événement `smart_locker_retrieved`
   (`locker_id`, `recipients`).
   Si la porte ne s'ouvre pas, un avertissement est loggé et le colis reste en attente : le PIN et
   le badge restent valides.
3. La porte se referme → casier **libéré automatiquement** (`libre`, PIN et assignations effacés).

Le bouton **Ouvrir** du dashboard (`smart_locker.open`) déclenche seulement l'impulsion, sans
changer l'état : il sert au dépôt ou à une vérification.

Exemple : être prévenu de chaque récupération.

```yaml
trigger:
  - platform: event
    event_type: smart_locker_retrieved
action:
  - action: notify.mobile_app_mon_telephone
    data:
      message: "Casier {{ trigger.event.data.locker_id }} récupéré par {{ trigger.event.data.recipients | join(', ') }}"
```

### Badges

Chaque destinataire peut avoir **un badge** (`badge_id`), unique. À chaque `esphome.badge_scanned` :

| Situation | Effet |
|---|---|
| Enrôlement en cours (carte Destinataires) | Badge attribué au destinataire, **aucun casier ouvert** |
| Badge connu, colis en attente | Ouverture de **tous** les casiers `occupé` / `en_attente` du destinataire (vert clignotant) |
| Badge connu, aucun colis | Rouge 3 s |
| Badge inconnu | Rouge 3 s, avertissement dans les logs |

Enrôlement : la carte ouvre une souscription WebSocket `smart_locker/badges/enroll`. Le prochain
badge lu dans les 30 s est attribué au destinataire. S'il appartient déjà à quelqu'un, la carte
reçoit `conflict` et demande confirmation avant `smart_locker/badges/assign` avec `force: true`
(le badge est alors retiré à l'ancien propriétaire). Un seul enrôlement à la fois : en lancer un
nouveau annule le précédent.

### Messages

Le titre, le texte (SMS, push, version texte de l'email) et le HTML de l'email sont des **templates
Jinja Home Assistant**, édités dans la carte **Messages** et validés à l'enregistrement.

| Variable | Exemple |
|---|---|
| `first_name`, `last_name`, `full_name` | Jean, Dupont, Jean Dupont |
| `locker` | 4 |
| `pin`, `pin_formatted` | 123456, 123-456 |
| `has_badge` | `true` si le destinataire a un badge |

Toutes les fonctions de template HA sont disponibles (`now()`, filtres…). Si un template est
invalide au moment de l'envoi, l'erreur est loggée et aucune notification n'est envoyée.

### Éclairage

Logique dans `leds.py` (classe `LedController`). Résumé :

| Déclencheur | Effet |
|---|---|
| Touche digicode, ouverture/fermeture de porte | Allume l'éclairage pour `led_timeout` s (prolongé à chaque activité) |
| Changement d'état d'un casier (dashboard) | Mise à jour des couleurs si l'éclairage est allumé |
| Bon PIN, badge avec colis, bouton **Ouvrir** | Casier(s) concerné(s) en vert clignotant 8 s, autres éteints |
| Mauvais PIN, saisie abandonnée, badge inconnu ou sans colis | Tous les casiers en rouge clignotant 3 s |
| Porte ouverte plus de `door_alert_delay` s | Casier en orange clignotant jusqu'à fermeture, même hors activité |

Code couleur détaillé : [Éclairage WLED](../hardware/wled-gledopto.md#code-couleur).

### Services exposés

| Service | Paramètres | Effet |
|---|---|---|
| `smart_locker.assign` | `locker_id`, `recipient_id` **ou** `user` (« Prénom Nom ») | Assigne un destinataire, génère le PIN |
| `smart_locker.unassign` | `locker_id`, `recipient_id` **ou** `user` | Retire un destinataire ; casier `libre` s'il n'en reste aucun |
| `smart_locker.notify` | `locker_id` | Envoie la notification avec PIN |
| `smart_locker.open` | `locker_id` | Impulsion relais (dépôt, vérification), sans changement d'état |
| `smart_locker.reset` | `locker_id` | Efface PIN et assignations, remet à libre (un casier hors service le reste) |
| `smart_locker.set_out_of_service` | `locker_id`, `out_of_service` (true / false) | Met hors service ou remet en service ; le contenu est conservé et l'état est recalculé à la remise en service |

Un destinataire inconnu est refusé avec une erreur.

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
      "notify_services": ["smtp_pharmacie", "smsfactor"],
      "badge_id": "4823117"
    }
  ],
  "settings": {
    "notification_title": "Colis mis à disposition à la pharmacie",
    "msg_text": "Bonjour {{ first_name }}, …",
    "msg_email_html": "<html>…</html>",
    "relay_device_id": "a1b2…",
    "keypad_device_id": "c3d4…",
    "led_entry_id": "01J…",
    "led_brightness": 190,
    "led_timeout": 30,
    "door_alert_delay": 60
  }
}
```

Les casiers (état, PIN, destinataires assignés, horodatages) sont dans
`.storage/smart_locker_lockers`, écrit **à chaque changement** (regroupé sur 1 s). Un redémarrage
de HA ou une coupure de courant ne perd donc ni les PIN ni les assignations.

```json
{
  "lockers": {
    "4": {
      "state": "en_attente",
      "assigned": ["uuid-du-destinataire"],
      "pin_code": "123456",
      "retrieved_at": null,
      "notified_at": {"uuid-du-destinataire": "01/10 10:00"}
    }
  }
}
```

### API WebSocket (usage interne cartes Lovelace)

| Commande | Description |
|---|---|
| `smart_locker/recipients/list` | Liste des destinataires |
| `smart_locker/recipients/add` | Ajouter un destinataire |
| `smart_locker/recipients/update` | Modifier un destinataire |
| `smart_locker/recipients/delete` | Supprimer un destinataire |
| `smart_locker/settings/get` | Lire les paramètres |
| `smart_locker/settings/set` | Modifier les paramètres (chaque clé est optionnelle) |
| `smart_locker/badges/enroll` | Souscription : attend le prochain badge lu (`waiting`, `enrolled`, `conflict`, `timeout`, `cancelled`) |
| `smart_locker/badges/assign` | Attribue un badge (`force` pour le reprendre à son propriétaire) ou le retire (`badge_id` vide) |
| `smart_locker/messages/preview` | Rend les templates avec un destinataire d'exemple |
| `smart_locker/hardware/status` | Appareils ESPHome et WLED disponibles, liaison casier par casier (bouton, porte, état) |
| `smart_locker/leds/devices` | Lister les contrôleurs WLED de HA (`entry_id`, `title`, `host`) |
| `smart_locker/leds/test` | Simuler une activité (allume l'éclairage) |

### Paramètres

| Clé | Défaut | Description |
|---|---|---|
| `notification_title` | *Colis mis à disposition à la pharmacie* | Template du titre (objet email, titre push) |
| `msg_text` | *Bonjour {{ first_name }}, un colis…* | Template du texte (SMS, push, texte de l'email) |
| `msg_email_html` | Email avec PIN en grand | Template du corps HTML de l'email |
| `relay_device_id` | *(vide)* | Appareil ESPHome de la carte relais ; vide = détection automatique |
| `keypad_device_id` | *(vide)* | Appareil ESPHome du digicode ; vide = tous les appareils écoutés |
| `led_entry_id` | *(vide)* | Entrée de l'intégration WLED à piloter ; vide = LED désactivées |
| `led_brightness` | 190 | Luminosité globale WLED (1-255) |
| `led_timeout` | 30 | Secondes d'éclairage après la dernière activité (5-3600) |
| `door_alert_delay` | 60 | Secondes de porte ouverte avant alerte orange (5-3600) |
