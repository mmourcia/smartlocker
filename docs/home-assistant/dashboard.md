# Home Assistant - Dashboard admin

## Installation

Copier le dossier `custom_components/smart_locker/` dans `config/custom_components/` de Home Assistant, puis redémarrer HA.

Le composant enregistre automatiquement au démarrage :
- les entités des 8 casiers (`smart_locker.casier_N`)
- le fichier JS des cartes Lovelace (`/smart_locker/smart-locker-card.js`)
- la ressource Lovelace (plus besoin de l'ajouter manuellement)

> **Fallback** : si l'auto-enregistrement Lovelace échoue (mode YAML strict),
> ajouter manuellement : **Paramètres › Tableaux de bord › Ressources** →
> URL `/smart_locker/smart-locker-card.js`, type **Module JavaScript**.

---

## configuration.yaml

### 1. Service de notification

Choisir **une** des options ci-dessous selon le moyen de notification souhaité.

#### Option A — SMTP (Gmail, OVH, Office 365…)

```yaml
notify:
  - name: smtp_pharmacie          # nom libre, repris dans smart_locker.notify_service
    platform: smtp
    server: smtp.gmail.com        # smtp.office365.com, ssl0.ovh.net…
    port: 587
    starttls: true
    sender: pharmacie@gmail.com
    username: pharmacie@gmail.com
    password: xxxx_xxxx_xxxx_xxxx # mot de passe d'application Gmail (pas le mot de passe du compte)
```

> Pour Gmail : compte Google › Sécurité › Mots de passe des applications.
> Créer un mot de passe dédié « Home Assistant ».

#### Option B — Google Mail (intégration OAuth2, sans YAML)

Ajouter l'intégration **Google Mail** via **Paramètres › Appareils et services**.
Elle crée automatiquement le service `notify.google_mail`. Aucune ligne YAML supplémentaire.

#### Option C — Application mobile (Companion App)

Aucune configuration YAML. Le service est créé automatiquement à l'installation
de l'app sur le téléphone. Son nom suit le format `notify.mobile_app_<nom_appareil>`.

---

### 2. Composant Smart Locker

```yaml
smart_locker:
  # Nom du service notify à utiliser (partie après "notify.")
  # Exemples : smtp_pharmacie | google_mail | mobile_app_oneplus12_mika
  notify_service: smtp_pharmacie

  # Optionnel — capteur digicode ESPHome (valeur par défaut ci-dessous)
  pin_sensor: sensor.smart_locker_digicode_code_pin_digicode
```

Seule la clé `notify_service` est utile à modifier. Le `pin_sensor` n'est à renseigner
que si le nom d'entité ESPHome diffère de la valeur par défaut.

> Les destinataires (prénom, nom, téléphone, email) et l'objet des notifications
> se gèrent directement depuis la carte **Destinataires** dans le dashboard — aucune
> modification de `configuration.yaml` requise.

---

## Cartes Lovelace

Coller ce YAML dans l'éditeur du tableau de bord :

```yaml
type: vertical-stack
cards:
  # Carte de gestion des destinataires et paramètres de notification
  - type: custom:smart-locker-recipients-card

  # Grille des 8 casiers
  - type: grid
    columns: 2
    square: false
    cards:
      - type: custom:smart-locker-card
        locker_id: 1
      - type: custom:smart-locker-card
        locker_id: 2
      - type: custom:smart-locker-card
        locker_id: 3
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

Les deux types de cartes peuvent aussi être placées sur des vues séparées
— elles proviennent du même fichier JS, aucune ressource supplémentaire à déclarer.

---

## Utilisation

### Carte Destinataires (`smart-locker-recipients-card`)

- **Objet des notifications** : champ éditable en haut de la carte (crayon). Valeur par défaut :
  *"Colis mis à disposition à la pharmacie"*. Persisté entre les redémarrages.
- **Tableau** : liste des destinataires avec prénom, nom, téléphone et email.
- **Boutons** : crayon (modifier), corbeille (supprimer), **Ajouter** (formulaire inline).

### Carte Casier (`smart-locker-card`)

| Élément | Description |
|---|---|
| Icône + couleur | État métier du casier |
| Badge état | Libre / Occupé / En attente / Récupéré / Hors service |
| Badge porte | Ouverte / Fermée (état physique reed switch) |
| Code PIN | Affiché si état Occupé ou En attente (ex : `620-181`) |
| Date récupération | Horodatage affiché si état Récupéré |
| Badges utilisateurs | Un badge par destinataire assigné, avec bouton × pour retirer |
| **Ouvrir** | Déclenche l'impulsion relais ESPHome |
| **Notifier** | Envoie la notification avec le code PIN au(x) destinataire(s) |
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
3. Cliquer **Notifier** → email/push envoyé avec le PIN, casier passe en **En attente**
4. Le destinataire saisit son PIN sur le digicode → casier s'ouvre automatiquement, passe en **Récupéré**
5. Cliquer **Libérer** pour remettre le casier à disposition
