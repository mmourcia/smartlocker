# Contrôleur LED WLED — Gledopto 4 voies

## Principe

Le contrôleur **Gledopto GL-C-007** (ou variante compatible WLED) est un contrôleur LED 4 voies
flashé avec le firmware [WLED](https://kno.wled.ge/). Il remplace les GPIO NeoPixel de l'ESP32 relais
pour la gestion des anneaux LED, et s'intègre nativement dans Home Assistant via l'intégration WLED.

## Mapping voies → casiers

Avec 4 voies pour 8 casiers, chaque voie pilote 2 anneaux en série ou en parallèle :

| Voie WLED | Casiers | Segment WLED |
|---|---|---|
| Voie 1 | Casier 1 + Casier 2 | Segment 0 (LEDs 0–23) |
| Voie 2 | Casier 3 + Casier 4 | Segment 1 (LEDs 0–23) |
| Voie 3 | Casier 5 + Casier 6 | Segment 2 (LEDs 0–23) |
| Voie 4 | Casier 7 + Casier 8 | Segment 3 (LEDs 0–23) |

> Chaque anneau WS2812B comprend 12 LEDs. 2 anneaux par voie = 24 LEDs par segment.
> Les 2 casiers d'une même voie partagent la couleur/animation — si on veut les différencier,
> il faut les câbler en série sur la même voie et définir des sous-segments dans WLED
> (LEDs 0–11 = casier A, LEDs 12–23 = casier B).

## Alimentation du contrôleur

Le Gledopto GL-C-007 accepte du **5V ou 12V** selon les broches utilisées. Les WS2812B fonctionnent en 5V.

```
Option A : 5V dédié
    Alim 5V/5A ──── Gledopto VIN/GND ──── Anneaux WS2812B

Option B : depuis le 12V (avec régulateur embarqué)
    12V alim principale ──── Gledopto VIN 12V ──── (régulateur interne) ──── WS2812B
```

Avec 8 anneaux × 12 LEDs × 60 mA (blanc plein) = **5,76 A en crête à 5V**.
Prévoir une alimentation 5V/6A dédiée ou s'assurer que le 12V/20A supporte la conversion.

## Intégration WLED

WLED expose une API HTTP/WebSocket et se découvre automatiquement via mDNS. Home Assistant
l'intègre nativement sans configuration manuelle :

1. WLED se connecte au WiFi (même réseau que le Raspberry Pi)
2. Home Assistant découvre automatiquement l'appareil (`Paramètres > Appareils et services`)
3. Les entités générées incluent :
   - `light.wled_smartlocker` — contrôle global
   - Segments individuels si configurés dans WLED

## Configuration WLED recommandée

Dans l'interface WLED (`http://<ip-wled>/`), créer 4 segments nommés :

| Segment | Nom | LEDs début | LEDs fin |
|---|---|---|---|
| 0 | casiers_1_2 | 0 | 23 |
| 1 | casiers_3_4 | 0 | 23 |
| 2 | casiers_5_6 | 0 | 23 |
| 3 | casiers_7_8 | 0 | 23 |

> Si les voies sont câblées indépendamment (GND/DATA séparés), chaque voie = un segment distinct
> dans WLED avec ses propres LEDs 0 à 23.

## Presets WLED pour les états casier

Créer des presets dans WLED pour chaque état :

| Preset | Couleur | Animation | État casier |
|---|---|---|---|
| 1 | Vert `#00FF00` | Fixe | Libre |
| 2 | Bleu `#0000FF` | Fixe | Occupé / notifié |
| 3 | Orange `#FF8C00` | Pulse lent | Code saisi, ouverture |
| 4 | Blanc `#FFFFFF` | Clignotant 1 Hz | Porte ouverte |
| 5 | Rouge `#FF0000` | Flash 3× | Code incorrect |
| 6 | Éteint | — | Hors service |

Ces presets sont appelables depuis Home Assistant via le service `wled.preset` ou via l'API REST WLED.

## Contrôle depuis Home Assistant

```yaml
# Exemple : allumer le segment casiers_1_2 en vert (casier libre)
service: light.turn_on
target:
  entity_id: light.wled_casiers_1_2
data:
  rgb_color: [0, 255, 0]
  brightness: 128
```

Ou via preset WLED :

```yaml
service: rest_command.wled_preset
data:
  ip: "192.168.1.x"
  preset: 1
  seg: 0
```

## Références

- [Firmware WLED](https://kno.wled.ge/)
- [Gledopto GL-C-007 sur WLED](https://kno.wled.ge/basics/compatible-hardware/#gledopto)
- [Intégration WLED dans Home Assistant](https://www.home-assistant.io/integrations/wled/)
