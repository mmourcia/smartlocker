# Alimentation

<img src="../img/alimentation_XDR-240E-12-.png" width="400"/>

Alimentation choisie : **Mean Well XDR-240-12** - 12V / 20A / 240W, format rail DIN.

## Architecture

| Source | Consommateur |
|---|---|
| Mean Well XDR-240-12 (12V / 20A) | Carte relais ESP32, serrures x7, contrôleur et rubans LED, clavier du digicode |
| Convertisseur 12V → 5V 15A (alimenté par la Mean Well) | ESP32 du digicode |

## Pourquoi 20A ?

| Consommateur | Courant estimé |
|---|---|
| Solénoïdes x7 (inrush simultané max) | 7 x 1 A = 7 A |
| Carte LC-Relay-ESP32-8R-D5 | ~0,5 A |
| ESP32 du digicode (via convertisseur 5V) + clavier | ~0,3 A |
| Rubans COB adressables x2, 53 pixels (limité à 3 A par WLED) | ≤ 3 A |
| **Total crête théorique** | **~11 A** |

En pratique les solénoïdes fonctionnent en impulsionnel (400 ms) et ne sont jamais tous actifs simultanément. Les LED ne sont jamais toutes à pleine luminosité. Le XDR-240-12 à 20A offre une marge confortable.

## Distribution 12V

Le transformateur dispose directement de plusieurs paires de bornes V+/V- en sortie. Chaque consommateur (serrures, contrôleur LED, carte relais, clavier du digicode, convertisseur 5V) est raccordé directement sur ces bornes avec du câble 2x0,5 mm².

L'ESP32 du digicode n'accepte pas le 12V : il est alimenté en 5V par un convertisseur abaisseur 12V → 5V (15A, très largement surdimensionné pour un ESP32 mais peu coûteux), branché sur les bornes 12V de la Mean Well.

## Bouton d'urgence

Le bouton doit connecter le +12V sur toutes les serrures simultanément, sans passer par les relais ni l'ESP32. Il fonctionne même en cas de panne logicielle. À placer dans un endroit à accès restreint.

### Problème de câblage direct

Relier simplement toutes les bornes NO des relais ensemble crée un problème : quand Home Assistant active un relais pour ouvrir un seul casier, le +12V se propage via les NO connectés et ouvre toutes les serrures.

### Solution : une diode 1N4007 par relais

Une diode sur chaque borne NO empêche la propagation du +12V entre relais tout en laissant passer le courant du bouton d'urgence dans le bon sens.

| NO relais | Diode 1N4007 | Vers bouton |
|---|---|---|
| NO relais 1 | Anode sur NO, cathode vers bouton | +12V serrures |
| NO relais 2 | Anode sur NO, cathode vers bouton | +12V serrures |
| ... | ... | ... |
| NO relais 8 | Anode sur NO, cathode vers bouton | +12V serrures |

```
+12V alim ──── Bouton urgence (NO) ──┬── cathode diode 1 ── anode ── NO relais 1
                                     ├── cathode diode 2 ── anode ── NO relais 2
                                     ├── ...
                                     └── cathode diode 8 ── anode ── NO relais 8
```

- Bouton appuyé : le +12V passe à travers toutes les diodes et ouvre toutes les serrures
- Relais activé par HA : le +12V est bloqué par les diodes des autres relais, seule la serrure concernée s'ouvre

La bande blanche de la 1N4007 (cathode) est côté bouton/serrures. Le côté non marqué (anode) est sur le NO du relais.
