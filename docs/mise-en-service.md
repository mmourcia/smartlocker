# Mise en service

Toutes les étapes, dans l'ordre, pour passer du meuble câblé à un locker opérationnel. Chaque étape
se termine par un **contrôle** : ne pas passer à la suivante tant qu'il n'est pas bon. Le détail
de chaque point est dans la page liée.

**Prérequis** : un mini PC sous Home Assistant OS, avec l'add-on **ESPHome** installé
(Paramètres › Modules complémentaires).

---

## 1. Câblage

Suivre la [fiche technique](fiche/fiche-technique.pdf) (recto) : serrures, reed switches,
digicode, rubans LED, alimentation 12V et convertisseur 5V.

- Câbler **hors tension** (230V coupé).
- Avant de brancher les cartes, mesurer **12V** sur les bornes de la Mean Well et **5V** en sortie
  du convertisseur.

✅ **Contrôle** : 12V et 5V présents, aucun échauffement.

Détails : [alimentation](hardware/alimentation.md), [serrure](hardware/serrure.md).

---

## 2. Carte relais

1. Créer `esphome/secrets.yaml` à partir de [`secrets.yaml.example`](../esphome/secrets.yaml.example)
   (Wi-Fi, clés API, mots de passe OTA). Dans l'add-on ESPHome, ces valeurs vont dans *Secrets*.
2. Premier flash par USB-UART, **cavalier G0–GND posé avant de brancher l'USB**, puis retiré
   (procédure : [carte relais](esphome/carte-relais.md#flashage-initial)).
3. Home Assistant détecte la carte : **Paramètres › Appareils et services › ESPHome › Configurer**,
   avec la clé API.

✅ **Contrôle** :
- « Porte casier N » passe à *Ouverte* / *Fermée* en manipulant chaque porte (7 portes) ;
- « Ouvrir casier N » déclenche bien la serrure **du même casier** (7 serrures).

---

## 3. Digicode

1. Flasher l'ESP32 du digicode avec [`smartlocker-digicode.yaml`](../esphome/smartlocker-digicode.yaml)
   (port USB de l'ESP32), puis l'ajouter dans HA comme la carte relais.
2. Si le clavier ne répond pas, le remettre en Wiegand 26 : `* 123456 # 0 31 #`.

✅ **Contrôle** : dans les logs ESPHome du digicode, chaque touche apparaît, et un badge présenté
remplit le capteur « Badge RFID ».

Détails : [digicode](esphome/digicode-wiegand.md).

---

## 4. Contrôleur LED (WLED)

1. Connecter le Gledopto au Wi-Fi (point d'accès `WLED-AP` au premier démarrage).
2. Restaurer la configuration et les presets sauvegardés dans [`wled/`](../wled/) :
   WLED › Config › Security & Updates › *Restore configuration*, puis *Restore presets*.
   Ressaisir ensuite le mot de passe Wi-Fi, qui n'est pas dans la sauvegarde.
3. Ajouter l'appareil dans HA : il est découvert automatiquement (intégration **WLED**).

✅ **Contrôle** : au redémarrage du Gledopto, le preset 1 « Smart-Locker-Structure » recrée
8 segments « Casier 1 » à « Casier 8 ». Le preset 128 (démo) allume chaque casier au bon endroit.

Détails : [éclairage WLED](hardware/wled-gledopto.md).

---

## 5. Composant smart_locker

1. Copier [`homeassistant/custom_components/smart_locker/`](../homeassistant/custom_components/smart_locker/)
   dans `config/custom_components/smart_locker/`.
2. Ajouter dans `configuration.yaml` :
   ```yaml
   smart_locker:
   ```
3. Redémarrer Home Assistant.

✅ **Contrôle** : les entités `smart_locker.casier_1` … `casier_8` (sans le 3) existent et sont
*libre* ; aucune erreur `smart_locker` dans les journaux.

---

## 6. Dashboard

Créer un tableau de bord avec les cartes Casiers (vue d'ensemble), Matériel, Destinataires et Messages (YAML prêt à
coller : [dashboard](home-assistant/dashboard.md#cartes-lovelace)). Si une carte affiche une erreur
de configuration, vider le cache du navigateur (Ctrl+Maj+R).

Puis, dans la carte **Matériel** : choisir la carte relais, le digicode et le contrôleur WLED,
régler la luminosité, **Enregistrer**. Les trois pastilles doivent être vertes.

✅ **Contrôle**, toujours dans la carte Matériel :
- **Carte relais** : les 7 casiers sont ✓ ; le test ▶ de chaque casier donne
  « Serrure et capteur OK » ;
- **Digicode** : en **Mode test**, un code tapé et un badge passé s'affichent ;
- **Éclairage** : **Tester** allume les 7 casiers, **Parcours** allume chaque casier à sa place ; le
  compartiment technique reste éteint.

---

## 7. Destinataires, badges et messages

1. Carte **Destinataires** : ajouter chaque destinataire (téléphone, email, canaux *Email* / *SMS*).
2. Enrôler les badges : icône carte d'identité du destinataire, puis passer le badge devant le
   lecteur dans les 30 s.
3. Carte **Messages**, section *Envoi* : renseigner le SMTP (Gmail : mot de passe d'application) et
   SMSFactor (jeton, expéditeur), **Enregistrer**, puis **Envoyer un test** pour chacun.
4. Carte **Messages**, contenu : adapter le titre, le SMS et l'email, vérifier avec **Aperçu**,
   **Enregistrer**.

✅ **Contrôle** : chaque badge apparaît sur la fiche du bon destinataire ; les pastilles *Email* et
*SMS* de la carte Messages sont *OK* et les messages de test sont bien arrivés.

---

## 8. Recette

Un passage complet, à faire avec un destinataire de test et son téléphone :

| # | Action | Résultat attendu |
|---|---|---|
| 1 | Assigner un casier au destinataire de test | Casier *occupé*, PIN affiché |
| 2 | **Notifier** | SMS / email reçu avec le bon casier et le bon PIN ; casier *en attente* |
| 3 | Taper un mauvais code | Tous les casiers en rouge clignotant 3 s |
| 4 | Taper 2 chiffres puis attendre 10 s | Rouge clignotant 3 s (saisie abandonnée) |
| 5 | Taper le bon code | Le casier clignote en vert seul et s'ouvre ; *récupéré* dès l'ouverture de la porte |
| 6 | Laisser la porte ouverte plus de 60 s | Orange clignotant sur ce casier |
| 7 | Refermer la porte | Casier *libre* automatiquement, vert |
| 8 | Réassigner, puis présenter le badge du destinataire | Le casier s'ouvre comme avec le code |
| 9 | Mettre un casier hors service (🔧) | Rouge fixe ; son PIN ne l'ouvre plus |
| 10 | Redémarrer Home Assistant avec un casier en attente | Le casier est toujours *en attente* avec le même PIN |

✅ **Contrôle** : les 10 lignes sont conformes. Imprimer la
[fiche technique](fiche/fiche-technique.pdf) et la laisser dans le compartiment technique.
