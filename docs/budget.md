# Budget

Budget réel, établi à partir des commandes Amazon (mai à octobre 2026), complété des éléments
achetés ailleurs. Montants en euros.

## Synthèse par poste

| Poste | Qté | HT | TTC |
|---|---|---|---|
| Mini PC Home Assistant (NiPoGi Pinova P1, Ryzen 3250U, 8 Go / 256 Go) | 1 | 219,00 | 219,00 |
| Serrures solénoïdes 12V | 8 | 99,92 | 119,92 |
| Carte relais ESP32 LC-Relay-ESP32-8R-D5 | 3 | 52,47 | 62,97 |
| Digicode RFID ReaIOKbii S20 (Wiegand, 125 kHz, 10 porte-clés EM4100 fournis) | 1 | 18,96 | 22,75 |
| Contrôleur WLED Gledopto GL-C-017WL-D (ESP32, 4 voies) | 1 | 23,92 | 29,01 |
| Ruban LED FCOB WS2811 12V 3 m + câble d'extension + kit de connecteurs | 3 | 48,30 | 57,97 |
| Alimentation QWORK 12V 20A 240W | 1 | 15,82 | 18,99 |
| Convertisseur 12V → 5V 15A | 1 | 15,82 | 18,99 |
| Coffret ABS IP65 300×200×170 mm | 1 | 41,66 | 49,99 |
| Rails DIN 35 mm (lot de 3) | 1 | 9,99 | 11,99 |
| Câbles, Wago, gaines, connecteurs, prises C14, serre-câbles | 11 | 119,55 | 143,48 |
| Diodes 1N4004 (lot de 150, isolation bouton d'urgence) | 1 | 5,82 | 6,99 |
| Adaptateur USB-UART TTL CH340G (flash carte relais) | 1 | 5,82 | 6,99 |
| **Total commandes Amazon** | | **677,05** | **769,04** |

TVA totale : 91,99 € (le mini PC, vendu par un vendeur tiers, est facturé sans TVA).

## Hors commandes Amazon

Estimations reprises du budget initial, à confirmer.

| Élément | Qté | Prix unitaire | TTC |
|---|---|---|---|
| Meuble IKEA Kallax 4x2 | 1 | 75,00 | 75,00 |
| Bloc porte Kallax | 8 | 17,50 | 140,00 |
| Filament 3D (gabarits, bague de copiage) | - | - | ~5,00 |
| Bouton d'urgence | 1 | ~2,00 | ~2,00 |
| **Total** | | | **~222,00** |

## Total projet

| | TTC |
|---|---|
| Commandes Amazon | 769,04 |
| Hors Amazon (estimé) | ~222,00 |
| **Total** | **~991,00** |

Soit **~142 € par casier** utile (7 casiers, la case 3 étant le compartiment technique).

Sans les achats en double (2 cartes relais de rechange, 41,98 €), le coût d'une reproduction du
meuble est d'environ **950 €**.

## Remarques

- **Cartes relais** : 3 achetées pour 1 en service. Les 2 autres sont des rechanges ou des cartes de
  test.
- **Serrures** : 8 achetées pour 7 casiers, soit une de rechange.
- **Badges** : les 10 porte-clés EM4100 livrés avec le digicode suffisent pour les destinataires.
- **Écarts avec la doc matérielle**, à harmoniser :
  - [Alimentation](hardware/alimentation.md) : la doc décrit une Mean Well XDR-240-12, l'alimentation
    commandée est une QWORK 12V 20A ;
  - diodes : la doc indique des 1N4007, celles commandées sont des 1N4004 (400 V, largement suffisant
    en 12 V) ;
  - convertisseur 12V → 5V 15A : usage à documenter.

## Détail des commandes Amazon

| Date | Commande | Article | Qté | HT | TVA | TTC |
|---|---|---|---|---|---|---|
| 20/05 | 407-9929121-3206748 | Serrure solénoïde 12V | 1 | 12,49 | 2,50 | 14,99 |
| 20/05 | 407-9929121-3206748 | Carte relais ESP32 LC-Relay-ESP32-8R-D5 | 1 | 17,49 | 3,50 | 20,99 |
| 20/05 | 407-9929121-3206748 | Alimentation QWORK 12V 20A 240W | 1 | 15,82 | 3,17 | 18,99 |
| 23/05 | 407-9284894-3458720 | Adaptateur USB-UART TTL CH340G | 1 | 5,82 | 1,17 | 6,99 |
| 27/05 | 407-1590496-0017148 | Carte relais ESP32 LC-Relay-ESP32-8R-D5 | 1 | 17,49 | 3,50 | 20,99 |
| 28/05 | 407-5306304-2139539 | Digicode RFID ReaIOKbii S20 + 10 porte-clés EM4100 | 1 | 18,96 | 3,79 | 22,75 |
| 29/05 | 407-9888739-5418768 | Diodes 1N4004 (lot de 150) | 1 | 5,82 | 1,17 | 6,99 |
| 29/05 | 407-9888739-5418768 | Wago 221-420 (lot de 5) | 1 | 10,24 | 2,05 | 12,29 |
| 29/05 | 407-9888739-5418768 | Câble unipolaire 0,5 mm² FLRY-B (2 × 5 m) | 1 | 8,21 | 1,64 | 9,85 |
| 29/05 | 407-9888739-5418768 | Câble 2 × 0,5 mm² (10 m) | 1 | 12,49 | 2,50 | 14,99 |
| 29/05 | 407-9888739-5418768 | Fil silicone 20 AWG (6 × 7 m) | 1 | 16,66 | 3,33 | 19,99 |
| 29/05 | 407-9888739-5418768 | Connecteurs à levier 8 entrées (lot de 10) | 1 | 8,32 | 1,67 | 9,99 |
| 29/05 | 407-2910804-2061157 | Rails DIN 35 mm 250 mm (lot de 3) | 1 | 9,99 | 2,00 | 11,99 |
| 29/05 | 407-4186484-3434720 | Mini PC NiPoGi Pinova P1 | 1 | 219,00 | 0,00 | 219,00 |
| 29/05 | 407-4186484-3434720 | Câble 4 × 0,5 mm² (15 m) | 1 | 24,74 | 4,95 | 29,69 |
| 29/05 | 407-4186484-3434720 | Ruban LED FCOB WS2811 12V 3 m 720 LED/m | 1 | 25,82 | 5,17 | 30,99 |
| 01/06 | 407-0397383-1865118 | Coffret ABS IP65 300×200×170 mm | 1 | 41,66 | 8,33 | 49,99 |
| 01/06 | 407-0954354-5835568 | Serrure solénoïde 12V | 6 | 74,94 | 15,00 | 89,94 |
| 27/08 | 407-1429995-4874746 | Wago 221-420 (lot de 5) | 1 | 10,42 | 2,09 | 12,51 |
| 21/09 | 407-5305346-9981931 | Convertisseur 12V → 5V 15A | 1 | 15,82 | 3,17 | 18,99 |
| 04/10 | 407-4313339-3785951 | Prises C14 IEC 320 encastrables (lot de 2) | 1 | 7,49 | 1,50 | 8,99 |
| 04/10 | 407-9193125-4495511 | Connecteurs bout à bout thermorétractables (200) | 1 | 9,32 | 1,87 | 11,19 |
| 04/10 | 407-6809118-8371554 | Serrure solénoïde 12V | 1 | 12,49 | 2,50 | 14,99 |
| 05/10 | 407-6028052-3432331 | Câble d'extension RGB 3 broches 20 AWG (10 m) | 1 | 9,99 | 2,00 | 11,99 |
| 05/10 | 407-6028052-3432331 | Tés pour tube IRL Ø20 mm (lot de 10, offert) | 1 | 0,00 | 0,00 | 0,00 |
| 05/10 | 407-5822175-4877110 | Kit connecteurs FCOB WS2811 3 broches 12 mm | 1 | 12,49 | 2,50 | 14,99 |
| 07/10 | 407-1748390-2738758 | Carte relais ESP32 LC-Relay-ESP32-8R-D5 | 1 | 17,49 | 3,50 | 20,99 |
| 07/10 | 407-9232963-3662766 | Contrôleur WLED Gledopto GL-C-017WL-D | 1 | 23,92 | 5,09 | 29,01 |
| 08/10 | 407-5778220-2773124 | Serre-câbles avec étiquettes (250) | 1 | 11,66 | 2,33 | 13,99 |
| **Total** | | | | **677,05** | **91,99** | **769,04** |
