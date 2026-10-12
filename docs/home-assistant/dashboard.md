# Home Assistant - Dashboard admin

## Installation

Copier le dossier [`homeassistant/custom_components/smart_locker/`](../../homeassistant/custom_components/smart_locker/) dans `config/custom_components/` de Home Assistant, puis redémarrer HA.

Le composant enregistre automatiquement au démarrage :
- les entités des 7 casiers utiles (`smart_locker.casier_N`, N = 1, 2, 4…8 — la case 3 est le compartiment technique)
- le fichier JS des cartes Lovelace (`/smart_locker/smart-locker-card.js`)
- la ressource Lovelace `/smart_locker/smart-locker-card.js?v=<version>` (plus besoin de l'ajouter
  manuellement). Une ressource existante est mise à jour à chaque nouvelle version, ce qui force
  les navigateurs à recharger les cartes.

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

> Les destinataires et leurs badges, les messages et le contrôleur LED se gèrent entièrement
> depuis les cartes **Destinataires**, **Messages** et **Éclairage** — aucune autre modification de
> `configuration.yaml` requise.

---

## Cartes Lovelace

Coller ce YAML dans l'éditeur du tableau de bord :

```yaml
type: vertical-stack
cards:
  # Carte de gestion des destinataires et paramètres de notification
  - type: custom:smart-locker-recipients-card

  # Templates des messages (titre, SMS, email)
  - type: custom:smart-locker-messages-card

  # Choix du contrôleur WLED et réglages de l'éclairage
  - type: custom:smart-locker-leds-card

```

Et, sur la vue principale, la vue d'ensemble des casiers :

```yaml
type: custom:smart-locker-lockers-card
# Options (valeurs par défaut) :
# title: Casiers        # titre affiché (vide pour le masquer)
# cases: 8              # nombre de cases du meuble
# columns: 2            # colonnes du meuble
# technical: [3]        # cases techniques (affichées grisées, sans action)
```

La grille reproduit le meuble : Kallax 4x2 debout, **impairs à gauche (1, 3, 5, 7), pairs à
droite (2, 4, 6, 8)**, la case 3 gardant sa place en gris « Technique ». Une seule carte suffit
pour tous les casiers, sur téléphone comme sur grand écran.

> **Ancienne carte par casier** : `custom:smart-locker-card` (avec `locker_id`) reste disponible,
> par exemple pour afficher un seul casier. Elle est moins adaptée au téléphone que la vue d'ensemble.
> Si votre tableau de bord contient encore une carte `locker_id: 3`, la supprimer : le casier 3 est le
> compartiment technique. L'entité orpheline `smart_locker.casier_3` peut aussi être supprimée
> (**Paramètres › Entités**).

Les cinq types de cartes peuvent aussi être placés sur des vues séparées
— elles proviennent du même fichier JS, aucune ressource supplémentaire à déclarer.

---

## Utilisation

### Carte Destinataires (`smart-locker-recipients-card`)

- **Tableau** : liste des destinataires avec prénom, nom, téléphone, email, services de notification
  et badge. Défile horizontalement sur téléphone.
- **Boutons** : carte d'identité (enrôler un badge), crayon (modifier), corbeille (supprimer),
  × à côté d'un badge (le retirer), **Ajouter** (formulaire inline).
- **Formulaire** : 4 champs texte + liste des services `notify.*` disponibles dans HA (cases à cocher).
  Sélectionner un ou plusieurs services par destinataire. Un destinataire peut recevoir à la fois
  un email et un SMS si les deux services sont cochés.

#### Badges

L'administrateur, devant le meuble :

1. clique sur l'icône **carte d'identité** du destinataire → bandeau *« Passez le badge de … devant
   le lecteur (30 s) »* ;
2. passe le badge devant le digicode → *« Badge … attribué à … »*, la colonne Badge est mise à jour.

Pendant l'enrôlement, le badge lu **n'ouvre aucun casier**. Si le badge appartient déjà à un autre
destinataire, le bandeau propose **Réattribuer** (le badge est retiré à l'ancien propriétaire) ou
**Annuler**. Sans badge lu en 30 s, l'enrôlement est annulé. Un destinataire a au plus un badge.

### Carte Messages (`smart-locker-messages-card`)

| Élément | Description |
|---|---|
| **Titre** | Objet de l'email, titre de la notification push |
| **Texte** | SMS, notification push, version texte de l'email |
| **Email HTML** | Corps HTML de l'email |
| Variables | Clic = insertion dans le dernier champ sélectionné (`{{ first_name }}`, `{{ pin_formatted }}`…) |
| **Aperçu** | Rend les trois templates avec un destinataire d'exemple (nombre de caractères du SMS, email affiché comme reçu) |
| **Valeurs par défaut** | Recharge les templates d'origine (à enregistrer ensuite) |
| **Enregistrer** | Valide puis sauvegarde ; un template invalide est refusé avec le message d'erreur |

Syntaxe : templates Jinja Home Assistant, par exemple
`{% if has_badge %}ou présentez votre badge{% endif %}`. Liste des variables :
[intégrations](integrations.md#messages).

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

### Carte Casiers (`smart-locker-lockers-card`)

Vue d'ensemble disposée comme le meuble : une tuile par case, avec le numéro, l'état (couleur), la porte (orange si
ouverte) et le destinataire (🔔 s'il a été notifié). L'en-tête résume la situation, par exemple :
*2 colis · 3 libres · 1 à notifier*.

Un toucher sur une tuile ouvre son **détail** sous la grille (un nouveau toucher le referme) :

| État | Mis en avant | Disponible aussi |
|---|---|---|
| Libre | Choisir le destinataire + **Assigner** | Ouvrir (dépôt), Hors service |
| À notifier | Code PIN, destinataires, **Notifier** | Ajouter un destinataire, Ouvrir, Libérer, Hors service |
| Colis en attente | Code PIN, destinataires avec l'heure de notification | Ajouter un destinataire, Ouvrir, Libérer, Hors service |
| Récupéré | Heure de récupération (libération auto à la fermeture) | Ouvrir, Libérer, Hors service |
| Hors service | **Remettre en service** | Ouvrir, Libérer |

Ouvrir, Libérer et Hors service demandent confirmation. Une erreur (par exemple un destinataire
supprimé) s'affiche en bas du détail.

### Carte Casier (`smart-locker-card`, ancienne)

| Élément | Description |
|---|---|
| Icône + couleur | État métier du casier |
| Badge état | Libre / Occupé / En attente / Récupéré / Hors service |
| Badge porte | Ouverte / Fermée (état physique reed switch) |
| Code PIN | Affiché si état Occupé ou En attente (ex : `620-181`) |
| Date récupération | Horodatage affiché si état Récupéré (porte ouverte, avant refermeture) |
| Badges utilisateurs | Un badge par destinataire assigné, avec bouton × pour retirer. Affiche l'icône 🔔 et l'heure si une notification a été envoyée. |
| **Ouvrir** | Impulsion relais pour déposer ou vérifier. **Ne change pas l'état** du casier |
| **Notifier** | Envoie la notification avec le code PIN. Un destinataire déjà notifié est ignoré (réinitialisé à la libération du casier). |
| **Libérer** | Remet le casier à l'état Libre, efface PIN et assignations (automatique après récupération). Un casier hors service le reste |
| 🔧 (clé) | Met le casier **hors service** (confirmation demandée) ou le remet en service. Hors service : rouge fixe, PIN et badge inopérants, **Notifier** et l'assignation sont désactivés. Le contenu est conservé : à la remise en service, le casier redevient libre, occupé ou en attente selon ce qu'il contient |
| Dropdown + ✚ | Assigner un destinataire (liste issue de la carte Destinataires) |

### États métier

| État | Couleur | Déclencheur |
|---|---|---|
| Libre | Vert | Initial ou après **Libérer** |
| Occupé (*À notifier* dans la vue d'ensemble) | Bleu | Après assignation d'un destinataire |
| En attente | Bleu | Après envoi de la notification (orange dans l'ancienne carte) |
| Récupéré | Cyan | Porte ouverte après un bon PIN ou badge, jusqu'à sa refermeture |
| Hors service | Rouge | Bouton 🔧 de la carte (serrure en panne, maintenance) |

### Flux de traitement d'un colis

1. Déposer le colis dans le casier
2. Assigner le destinataire via le dropdown → le casier passe en **Occupé**, un PIN à 6 chiffres est généré
3. Cliquer **Notifier** → email/SMS envoyé avec le PIN, casier passe en **En attente**, badge 🔔 horodaté affiché
4. Le destinataire tape ses 6 chiffres sur le digicode (pas de `#`), ou présente son badge → serrure(s) actionnée(s)
5. La porte s'ouvre → **Récupéré** ; il la referme → casier **libéré automatiquement**

Si la porte ne s'ouvre pas dans les 30 s (serrure bloquée, destinataire parti), le colis reste en
attente et le PIN reste valide. **Libérer** reste disponible pour un cas particulier (colis repris
par le gestionnaire, erreur d'assignation).
