# Alimentation

## Architecture générale

```
230V AC (prise murale)
    └── Réglette multiprise (3 sorties minimum)
            ├── Transformateur 12V / 20A  →  Serrures × 8 + carte ESP32
            ├── Alimentation USB-C 5V / 3A  →  Raspberry Pi 4
            └── Chargeur USB               →  Tablette Android (dashboard)
```

## Alimentation 12V / 20A

### Pourquoi 20A ?

| Consommateur | Courant estimé |
|---|---|
| Solénoïde × 8 (inrush simultané max) | 8 × 1 A = 8 A |
| Solénoïde × 8 (maintien — non applicable, mode impulsionnel) | 0 A |
| Carte LC-Relay-ESP32-8R-D5 | ~0,5 A |
| Anneaux NeoPixel WS2812B × 8 (plein blanc) | 8 × 0,72 A = ~5,8 A |
| **Total crête théorique** | **~14 A** |

En pratique, les solénoïdes fonctionnent en impulsionnel (400 ms) et ne sont jamais tous actifs simultanément. Les LED ne sont jamais toutes à plein blanc. Un transformateur **12V / 20A (240 W)** offre une marge confortable et évite les chutes de tension lors des pics d'inrush.

> Un transformateur sous-dimensionné (ex. 12V/3A comme indiqué dans l'ancienne spec) est insuffisant
> dès qu'on additionne les 8 anneaux LED. Préférer un modèle à découpage de qualité (Mean Well RS-240-12
> ou équivalent).

### Références recommandées

| Référence | Format | Notes |
|---|---|---|
| Mean Well RS-240-12 | Rail DIN | Qualité industrielle, 240W, 20A |
| Mean Well LRS-240-12 | Boîtier fermé | Version compacte pour coffret électrique |
| Générique 12V/20A à découpage | Boîtier ouvert | Moins cher, vérifier le label CE |

### Distribution 12V

```
Sortie transformateur 12V/20A
    └── Bornier de distribution (10 bornes min.)
            ├── Carte ESP32-8R-D5 (VIN 12V)
            ├── Serrure casier 1
            ├── Serrure casier 2
            ├── ...
            ├── Serrure casier 8
            └── Bouton d'urgence (bypass hardware)
```

Utiliser du câble **2×1,5 mm²** en sortie du transformateur jusqu'au bornier principal.
Câble **2×0,5 mm²** pour chaque serrure individuelle (longueur ≤ 1 m typiquement).

## Bouton d'urgence

Le bouton est câblé en **bypass hardware direct** : quand il est appuyé, il connecte le +12V directement sur les solénoïdes de toutes les serrures, indépendamment des relais et de l'ESP32.

```
+12V ──── Bouton urgence (NO, protégé) ──── Commun serrures (+)
```

Ce circuit fonctionne même en cas de panne logicielle, réseau, ou coupure de l'ESP32. À protéger physiquement (boîtier à clé ou accès restreint) pour éviter les ouvertures intempestives.

## Alimentation 5V Raspberry Pi 4

Utiliser une alimentation USB-C officielle Raspberry Pi (5V / 3A minimum) ou équivalent certifié.
Ne pas alimenter le Pi via un hub USB ou un chargeur de téléphone générique : risque d'instabilité.

## Schéma résumé

```
230V ──┬── Transfo 12V/20A ──┬── ESP32 + Relais
       │                     ├── Serrures × 8
       │                     ├── Bouton urgence
       │                     └── (WLED Gledopto si alimentation séparée)
       │
       ├── Alim 5V/3A ──── Raspberry Pi 4
       │
       └── Chargeur USB ── Tablette Android
```
