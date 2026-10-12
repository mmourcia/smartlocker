# Home Assistant - Dashboard admin

## Installation

Copier le dossier [`homeassistant/custom_components/smart_locker/`](../../homeassistant/custom_components/smart_locker/) dans `config/custom_components/` de Home Assistant, puis redémarrer HA.

Le composant enregistre automatiquement au démarrage :
- les entités des 7 casiers utiles (`smart_locker.casier_N`, N = 1, 2, 4…8 — la case 3 est le compartiment technique)
- le fichier JS des cartes Lovelace (`/smart_locker/smart-locker-card.js`)
- la ressource Lovelace (plus besoin de l'ajouter manuellement)

> **Fallback** : si l'auto-enregistrement Lovelace échoue (mode YAML strict),
> ajouter manuellement : **Paramètres › Tableaux de bord › Ressources** →
> URL `/smart_locker/smart-locker-card.js`, type **Module JavaScript**.

---

## configuration.yaml

### 1. Services de notification

Les services de notification sont sélectionnés **par destinataire** depuis la carte Destinataires
(champ *Services de notification*). Déclarer ici les services HA souhaités — choisir une ou
plusieurs options selon les moyens de contact disponibles.

#### Option A — SMTP (Gmail, OVH, Office 365…)

```yaml
notify:
  - name: smtp_pharmacie
    platform: smtp
    server: smtp.gmail.com        # smtp.office365.com, ssl0.ovh.net…
    port: 587
    starttls: true
    sender: pharmacie@gmail.com
    username: pharmacie@gmail.com
    password: !secret smtp_password   # mot de passe d'application Gmail
```

> Pour Gmail : compte Google › Sécurité › Mots de passe des applications.
> Créer un mot de passe dédié « Home Assistant ».

#### Option B — Google Mail (intégration OAuth2, sans YAML)

Ajouter l'intégration **Google Mail** via **Paramètres › Appareils et services**.
Elle crée automatiquement le service `notify.google_mail`. Aucune ligne YAML supplémentaire.

#### Option C — Application mobile (Companion App)

Aucune configuration YAML. Le service est créé automatiquement à l'installation
de l'app sur le téléphone. Son nom suit le format `notify.mobile_app_<nom_appareil>`.

#### Option D — SMS via SMSFactor (API REST)

Créer d'abord la clé dans `secrets.yaml` :

```yaml
# secrets.yaml
smsfactor_token: "Bearer VOTRE_TOKEN_API_SMSFACTOR"
```

Puis dans `configuration.yaml` :

```yaml
notify:
  - name: smsfactor
    platform: rest
    resource: https://api.smsfactor.com/send
    method: GET
    headers:
      Authorization: !secret smsfactor_token
      Accept: "application/json"
    message_param_name: text
    target_param_name: to
    data:
      pushtype: alert
      sender: PharmacieHV        # nom affiché comme expéditeur (11 car. max)
```

> Le token API est disponible sur [app.smsfactor.com](https://app.smsfactor.com) › API.
> La clé `Authorization` doit être hors guillemets dans YAML pour que `!secret` soit résolu.
> Le champ **Tél mobile** du destinataire doit être renseigné (format `0612345678`).

---

### 2. Composant Smart Locker

```yaml
smart_locker:
```

Aucune option. L'ancienne clé `pin_sensor` est obsolète et peut être retirée (le PIN est reçu par
événement ESPHome).

> Les destinataires, l'objet des notifications et le contrôleur LED se gèrent entièrement
> depuis les cartes **Destinataires** et **Éclairage** — aucune autre modification de
> `configuration.yaml` requise.

---

## Cartes Lovelace

Coller ce YAML dans l'éditeur du tableau de bord :

```yaml
type: vertical-stack
cards:
  # Carte de gestion des destinataires et paramètres de notification
  - type: custom:smart-locker-recipients-card

  # Choix du contrôleur WLED et réglages de l'éclairage
  - type: custom:smart-locker-leds-card

  # Grille des 7 casiers (la case 3 est le compartiment technique)
  - type: grid
    columns: 2
    square: false
    cards:
      - type: custom:smart-locker-card
        locker_id: 1
      - type: custom:smart-locker-card
        locker_id: 2
      - type: custom:smart-locker-card
        locker_id: 4
      - type: custom:smart-locker-card
        locker_id: 5
      - type: custom:smart-locker-card
        locker_id: 6
      - type: custom:smart-locker-card
        locker_id: 7
      - type: custom:smart-locker-card
        locker_id: 8
```

Les trois types de cartes peuvent aussi être placés sur des vues séparées
— elles proviennent du même fichier JS, aucune ressource supplémentaire à déclarer.

---

## Utilisation

### Carte Destinataires (`smart-locker-recipients-card`)

- **Objet des notifications** : champ éditable en haut de la carte (crayon). Valeur par défaut :
  *"Colis mis à disposition à la pharmacie"*. Persisté entre les redémarrages.
- **Tableau** : liste des destinataires avec prénom, nom, téléphone, email et services de notification.
- **Boutons** : crayon (modifier), corbeille (supprimer), **Ajouter** (formulaire inline).
- **Formulaire** : 4 champs texte + liste des services `notify.*` disponibles dans HA (cases à cocher).
  Sélectionner un ou plusieurs services par destinataire. Un destinataire peut recevoir à la fois
  un email et un SMS si les deux services sont cochés.

### Carte Éclairage (`smart-locker-leds-card`)

| Élément | Description |
|---|---|
| **Contrôleur WLED** | Liste des appareils de l'intégration WLED de HA. *Aucun* = LED désactivées |
| **Luminosité** | Luminosité globale (1-255) |
| **Durée d'allumage** | Secondes d'éclairage après la dernière touche / porte |
| **Alerte porte ouverte** | Secondes avant le clignotement orange d'une porte restée ouverte |
| **Enregistrer** | Sauvegarde et applique immédiatement |
| **Tester** | Allume l'éclairage comme si quelqu'un tapait sur le digicode |
| Légende | Rappel du code couleur |

Prérequis : le Gledopto doit être ajouté dans HA (**Paramètres › Appareils et services › WLED**),
avec ses segments configurés (voir [Éclairage WLED](../hardware/wled-gledopto.md#segments)).

### Carte Casier (`smart-locker-card`)

| Élément | Description |
|---|---|
| Icône + couleur | État métier du casier |
| Badge état | Libre / Occupé / En attente / Récupéré / Hors service |
| Badge porte | Ouverte / Fermée (état physique reed switch) |
| Code PIN | Affiché si état Occupé ou En attente (ex : `620-181`) |
| Date récupération | Horodatage affiché si état Récupéré |
| Badges utilisateurs | Un badge par destinataire assigné, avec bouton × pour retirer. Affiche l'icône 🔔 et l'heure si une notification a été envoyée. |
| **Ouvrir** | Déclenche l'impulsion relais ESPHome |
| **Notifier** | Envoie la notification avec le code PIN. Un destinataire déjà notifié est ignoré (réinitialisé à la libération du casier). |
| **Libérer** | Remet le casier à l'état Libre, efface PIN et assignations |
| Dropdown + ✚ | Assigner un destinataire (liste issue de la carte Destinataires) |

### États métier

| État | Couleur | Déclencheur |
|---|---|---|
| Libre | Vert | Initial ou après **Libérer** |
| Occupé | Bleu | Après assignation d'un destinataire |
| En attente | Orange | Après envoi de la notification |
| Récupéré | Cyan | Après ouverture (bouton ou digicode) |
| Hors service | Rouge | Manuel |

### Flux de traitement d'un colis

1. Déposer le colis dans le casier
2. Assigner le destinataire via le dropdown → le casier passe en **Occupé**, un PIN à 6 chiffres est généré
3. Cliquer **Notifier** → email/SMS envoyé avec le PIN, casier passe en **En attente**, badge 🔔 horodaté affiché
4. Le destinataire tape ses 6 chiffres sur le digicode (pas de `#`) → casier s'ouvre automatiquement, passe en **Récupéré**
5. Cliquer **Libérer** pour remettre le casier à disposition
