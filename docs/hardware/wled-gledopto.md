# Éclairage - Rubans COB et contrôleur WLED Gledopto

## Principe

Chaque case du Kallax est éclairée par une portion de **ruban COB adressable** (WS281x).
Deux rubans parcourent le meuble, pilotés par un contrôleur **Gledopto** flashé avec
[WLED](https://kno.wled.ge/). Le composant `smart_locker` commande WLED directement selon l'état
des casiers (voir [code couleur](#code-couleur)).

> Les anneaux NeoPixel prévus au départ ont été abandonnés (intégration trop compliquée).

## Câblage

| Ruban | GPIO Gledopto | LED WLED | Casiers |
|---|---|---|---|
| Ruban 1 | GPIO16 | 0 → 25 (26 LED) | 1, 3, 5, 7 |
| Ruban 2 | GPIO4 | 26 → 52 (27 LED) | 2, 4, 6, 8 |

- Type de LED WLED : WS281x (type 22), ordre RGB, 53 LED au total.
- Limiteur de courant WLED : 3 000 mA au total.
- Bouton physique du Gledopto sur GPIO17, relais d'alimentation LED sur GPIO18.
- mDNS : `wled-locker` (nom d'appareil `WLED-Gledopto`).

## Segments

Un segment WLED par case, nommé « Casier N ». **L'identifiant de segment vaut `N - 1`** : c'est
la seule convention dont dépend le composant (`LED_SEGMENTS` dans `const.py`).

| Segment | Nom | LED (début → fin exclue) | Ruban |
|---|---|---|---|
| 0 | Casier 1 | 0 → 6 | 1 |
| 1 | Casier 2 | 26 → 32 | 2 |
| 2 | Casier 3 | 7 → 13 | 1 |
| 3 | Casier 4 | 33 → 39 | 2 |
| 4 | Casier 5 | 14 → 20 | 1 |
| 5 | Casier 6 | 40 → 46 | 2 |
| 6 | Casier 7 | 21 → 26 | 1 |
| 7 | Casier 8 | 47 → 53 | 2 |

La case 3 est le compartiment technique : son segment existe dans WLED mais le composant le
laisse toujours éteint.

Le **preset 1 « Smart-Locker-Structure »** recrée ces segments et est chargé au démarrage du
Gledopto (`def.ps = 1`). Ne pas le supprimer : le composant n'envoie que les identifiants de
segment, pas leurs bornes.

## Sauvegarde de la configuration

Les exports WLED sont versionnés dans [`wled/`](../../wled/) :

| Fichier | Contenu | Restauration |
|---|---|---|
| `wled/cfg.json` | Configuration matérielle (rubans, GPIO, WiFi sans mot de passe) | WLED › Config › Security & Updates › Restore configuration |
| `wled/presets.json` | Preset de structure + presets de démonstration | WLED › Config › Security & Updates › Restore presets |

Presets disponibles :

| Preset | Nom | Usage |
|---|---|---|
| 1 | Smart-Locker-Structure | Segments, chargé au boot |
| 100-109 | DEMO - Casier N / Final / Extinction | Allumage casier par casier |
| 110 | DEMO - SmartLocker Light Show | Playlist des presets 100-109 |
| 120-127 | SmartLocker - Situation initiale, Accès, Porte ouverte… | Scénario réaliste, source du code couleur |
| 128 | SmartLocker - DEMO REALISTE | Playlist des presets 120-127 |

## Code couleur

Issu des presets 120-127 et appliqué par le composant :

| Situation | Couleur | Effet | Casiers concernés |
|---|---|---|---|
| Casier libre ou colis récupéré | Vert `0,255,0` | Fixe | Le casier |
| Colis en attente (occupé / notifié) | Bleu `0,75,255` | Fixe | Le casier |
| Casier hors service | Rouge `255,0,0` | Fixe | Le casier |
| Code ou badge correct | Vert `0,255,0` | Blink (8 s) | Le(s) casier(s) qui s'ouvre(nt), **tous les autres éteints** |
| Code incorrect, saisie abandonnée (timeout digicode), badge inconnu ou sans colis | Rouge `255,0,0` | Blink (3 s) | Tous les casiers |
| Porte ouverte trop longtemps | Orange `255,110,0` | Blink | Le casier, jusqu'à fermeture |

## Quand l'éclairage s'allume

Les LED sont **éteintes par défaut**. Elles s'allument sur activité devant le meuble :

- appui sur une touche du digicode (événement `esphome.keypad_key_pressed`) ;
- badge RFID présenté ;
- ouverture ou fermeture d'une porte ;
- boutons **Tester** et **Parcours** de la carte Matériel.

Elles s'éteignent après la *durée d'allumage* (30 s par défaut) sans nouvelle activité. Une alerte
« porte ouverte trop longtemps » reste visible même hors activité (seul le casier en alerte clignote).

## Pilotage depuis Home Assistant

1. Le Gledopto est ajouté dans HA via l'intégration **WLED** (découverte automatique).
2. Dans la carte Lovelace **Matériel** (`custom:smart-locker-hardware-card`), choisir ce contrôleur.
   Voir [dashboard](../home-assistant/dashboard.md#carte-matériel-smart-locker-hardware-card).

Le composant récupère l'adresse IP du contrôleur dans l'entrée de l'intégration WLED, puis envoie
chaque changement en **une seule requête** `POST http://<ip>/json/state` contenant les 8 segments.
Changement atomique, sans scintillement, contrairement à 8 appels `light.turn_on` successifs.
Un état identique au précédent n'est pas renvoyé.

Exemple de requête (code correct sur le casier 2) :

```json
{
  "on": true, "bri": 190, "transition": 0,
  "seg": [
    {"id": 0, "on": false},
    {"id": 1, "on": true, "bri": 255, "col": [[0,255,0],[0,0,0],[0,0,0]], "fx": 1, "sx": 170},
    {"id": 2, "on": false}
  ]
}
```

Les entités `light.*` créées par l'intégration WLED restent utilisables pour des essais, mais
le composant réécrit l'état à la prochaine activité.

## Références

- [Firmware WLED](https://kno.wled.ge/)
- [API JSON WLED](https://kno.wled.ge/interfaces/json-api/)
- [Intégration WLED dans Home Assistant](https://www.home-assistant.io/integrations/wled/)
