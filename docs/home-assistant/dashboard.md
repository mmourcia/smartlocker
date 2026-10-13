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

### Notifications : plus de bloc `notify:`

L'email (SMTP) et le SMS (SMSFactor) sont envoyés **par le composant lui-même**, à l'adresse et au
mobile saisis dans la carte Destinataires. Ils se configurent dans la carte **Messages**, section
*Envoi* : aucune ligne YAML.

> **Pourquoi ?** Les services `notify` YAML (`platform: smtp`, `platform: rest`) sont l'ancien
> système de Home Assistant, en cours d'abandon. Le nouveau (entités `notify`) n'accepte pas de
> destinataire au moment de l'envoi : il faudrait une entité par personne, sans email HTML.

**Installation existante** : les destinataires qui utilisaient `smtp_xxx` / `smsfactor` sont basculés
automatiquement sur les canaux *Email* / *SMS*. Tant que l'envoi intégré n'est pas configuré, ces
anciens services restent utilisés ; une fois la section *Envoi* enregistrée et testée, les blocs
`notify:` correspondants peuvent être retirés de `configuration.yaml`.

L'**app mobile Companion** reste utilisable : ses services `notify.mobile_app_<appareil>` se cochent
par destinataire dans *Autres services Home Assistant*.

---

### Composant Smart Locker

```yaml
smart_locker:
```

Aucune option. L'ancienne clé `pin_sensor` est obsolète et peut être retirée (le PIN est reçu par
événement ESPHome).

> Les destinataires et leurs badges, les messages et leur envoi, et le matériel se gèrent entièrement
> depuis les cartes **Destinataires**, **Messages** et **Matériel** — aucune autre modification de
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

  # Carte relais, digicode et éclairage : choix, état et tests
  - type: custom:smart-locker-hardware-card

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

Les six types de cartes peuvent aussi être placés sur des vues séparées
— elles proviennent du même fichier JS, aucune ressource supplémentaire à déclarer.

---

## Utilisation

### Carte Destinataires (`smart-locker-recipients-card`)

- **Liste** : une fiche par destinataire, triée par nom (prénom et nom, téléphone et email, canaux
  *Email* / *SMS* et autres services, badge). Un destinataire sans aucun canal est signalé « Aucune
  notification ». Lisible sur téléphone sans défilement horizontal.
- **Boutons** : carte d'identité (enrôler un badge), crayon (modifier), corbeille (supprimer),
  × à côté d'un badge (le retirer), **Ajouter** (formulaire inline).
- **Formulaire** : prénom, nom, mobile, email, puis :
  - **Notifications** : *Email* et/ou *SMS* (envoi intégré, configuré dans la carte Messages). Cocher
    *Email* exige une adresse, *SMS* un mobile ;
  - **Autres services Home Assistant** (optionnel) : par exemple `mobile_app_<téléphone>` pour une
    notification sur l'app Companion.

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
| **Envoi › Email (SMTP)** | Serveur, port, chiffrement (STARTTLS 587 / SSL 465 / aucun), identifiant, mot de passe, adresse d'expédition, nom affiché. Gmail : mot de passe d'application |
| **Envoi › SMS (SMSFactor)** | URL de l'API, jeton, expéditeur (11 caractères max). Les numéros `06…` sont convertis en `336…` |
| Pastille (par canal) | *Non configuré*, *Configuré*, *OK* (dernier envoi réussi) ou *Erreur* (avec le message) |
| **Envoyer un test** | Envoie le message réel (destinataire d'exemple) à l'adresse ou au numéro indiqué ; l'erreur éventuelle s'affiche en clair |
| **Titre** | Objet de l'email, titre de la notification push |
| **Texte** | SMS, notification push, version texte de l'email |
| **Email HTML** | Corps HTML de l'email |
| Variables | Clic = insertion dans le dernier champ sélectionné (`{{ first_name }}`, `{{ pin_formatted }}`…) |
| **Aperçu** | Rend les trois templates avec un destinataire d'exemple (nombre de caractères du SMS, email affiché comme reçu) |
| **Valeurs par défaut** | Recharge les templates d'origine (à enregistrer ensuite) |
| **Enregistrer** | Valide puis sauvegarde ; un template invalide est refusé avec le message d'erreur |

Le mot de passe SMTP et le jeton SMSFactor ne sont jamais réaffichés : un champ laissé vide conserve
la valeur enregistrée.

Syntaxe : templates Jinja Home Assistant, par exemple
`{% if has_badge %}ou présentez votre badge{% endif %}`. Liste des variables :
[intégrations](integrations.md#messages).

### Carte Matériel (`smart-locker-hardware-card`)

À configurer en premier sur une nouvelle installation, et premier endroit à regarder en cas de
panne. Trois blocs, un par équipement, chacun avec son état (pastille) et son test :

**Carte relais** · pastille *En ligne / Hors ligne*

| Élément | Description |
|---|---|
| Appareil | Appareil ESPHome des serrures et des portes. *Détection automatique* par défaut : le texte dessous indique l'appareil trouvé |
| Liaison des casiers | Pour chaque casier : bouton d'ouverture et capteur de porte trouvés (✓, avec leur identifiant) ou ✗ *Introuvable* ; état de la porte en direct |
| ▶ (par casier) | **Test** : actionne la serrure (après confirmation) et attend que le capteur voie la porte s'ouvrir (10 s). Résultat : ✓ *Serrure et capteur OK*, ou *Porte non détectée* (serrure bloquée, relais, aimant ou câblage du reed). L'état du casier n'est pas modifié |

Un ✗ signifie que l'entité n'existe pas sur la carte relais : vérifier le YAML ESPHome (noms
« Ouvrir casier N » / « Porte casier N ») ou que l'entité n'est pas désactivée dans HA.

**Digicode** · pastille *En ligne / Hors ligne / Non choisi*

| Élément | Description |
|---|---|
| Appareil | Appareil ESPHome du clavier. Une fois choisi, les codes et badges des autres appareils sont ignorés |
| **Mode test** | Pendant 2 minutes (ou jusqu'à *Arrêter le test*), tout ce qui arrive du digicode s'affiche au lieu d'être traité : touches, code saisi et casier correspondant (« Code 636913 → casier 4 », ou « aucun casier »), badge et destinataire, saisie abandonnée, appareil d'origine s'il n'est pas le digicode choisi. **Rien ne s'ouvre et l'éclairage ne réagit pas** pendant le test |

**Éclairage** · pastille *Joignable / Injoignable / Non testé / Désactivé*

| Élément | Description |
|---|---|
| Contrôleur WLED | Appareil de l'intégration WLED. *Aucun* = LED désactivées. En cas d'échec, le message d'erreur du dernier envoi est affiché |
| Luminosité, Allumage, Alerte porte | Luminosité globale (1-255), secondes d'éclairage après la dernière activité, secondes de porte ouverte avant l'alerte orange |
| **Tester** | Allume l'éclairage et vérifie que le WLED répond (la pastille se met à jour) |
| **Parcours** | Allume chaque casier en blanc, l'un après l'autre (2 s chacun), en affichant son numéro : vérifie que chaque segment correspond au bon casier |

**Enregistrer** (en bas) sauvegarde les appareils choisis et les réglages d'éclairage.

Prérequis pour l'éclairage : le Gledopto ajouté dans HA (**Paramètres › Appareils et services ›
WLED**), avec ses segments configurés (voir [Éclairage WLED](../hardware/wled-gledopto.md#segments)).

> **Carte Éclairage** (`smart-locker-leds-card`) : obsolète depuis la v0.8.0, ses réglages sont dans
> la carte Matériel. Elle affiche désormais un simple message et peut être retirée.

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
