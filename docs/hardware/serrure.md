# Serrure solénoïde

## Référence

**Amazon B07KWMH16C** — Solénoïde de porte 12V DC, type fail-secure (normalement verrouillée).

## Principe de fonctionnement

La serrure est de type **fail-secure** (sécurité en cas de coupure) :

| Alimentation | État |
|---|---|
| 0V (repos) | Verrou **sorti** → porte **verrouillée** |
| 12V (impulsion) | Verrou **rentré** → porte **déverrouillée** |

En cas de coupure de courant, toutes les portes restent verrouillées. Le bouton d'urgence hardware permet un bypass direct sur le +12V pour tout ouvrir indépendamment du logiciel.

## Pilotage via relais

Chaque serrure est commandée par un relais de la carte **LC-Relay-ESP32-8R-D5**. Le relais est câblé en mode impulsionnel dans ESPHome : une impulsion de courte durée (typiquement 300 à 500 ms) suffit à libérer le mécanisme.

```
ESP32 GPIO → Relais NO → +12V → Solénoïde → GND commun
```

Le relais est normalement ouvert (NO). Lors de l'activation, il ferme le circuit 12V vers le solénoïde pendant la durée de l'impulsion.

### Paramètre d'impulsion recommandé

| Paramètre | Valeur |
|---|---|
| Durée impulsion | 400 ms |
| Courant typique | 0.5–1 A pendant l'impulsion |
| Courant de maintien | non nécessaire (solénoïde à verrou mécanique) |

> Ne pas maintenir le solénoïde alimenté en continu : il chauffe et peut s'endommager.
> Une impulsion suffit ; le mécanisme mécanique maintient l'ouverture jusqu'à la refermeture de la porte.

## Retour d'état via reed switch

Chaque casier dispose d'un **reed switch MC-38** fixé sur le châssis, en face de l'aimant solidaire de la porte.

| État porte | Contact reed switch | Signal GPIO |
|---|---|---|
| Fermée | Fermé (circuit actif) | LOW (avec pull-up interne) |
| Ouverte | Ouvert (circuit coupé) | HIGH |

```
GPIO ESP32 (pull-up interne activé) ──┬── Reed switch ── GND
                                      │
                                  lecture état
```

ESPHome remonte l'état comme un `binary_sensor` de classe `door`.

## Câblage serrure + reed switch (par casier)

```
                ┌─────────────────────────┐
 +12V (alim) ───┤ NO relais               │
                │           COM ──────────┼── Solénoïde (+)
                └─────────────────────────┘
                                             Solénoïde (−) ── GND 12V

 GPIO_n ─────────────────── Reed switch ─── GND
 (pull-up)
```

## Notes d'installation

- Fixer la partie magnétique sur le battant de la porte, la partie contact sur le châssis fixe.
- Aligner soigneusement : le déclenchement doit être fiable à ±2 mm de jeu.
- Utiliser du câble souple 2×0,5 mm² pour la serrure (courant ~1A en impulsion).
- Utiliser du câble fin 2×0,22 mm² pour le reed switch (signal uniquement).
