# 📦 Smart Locker - Casiers connectés pilotés par Home Assistant

## Le projet

Ce projet est un système de casiers connectés à usage intérieur, conçu pour permettre le dépôt et la récupération de colis dans un environnement partagé.

Le principe est simple : une personne dépose un colis dans un casier libre, l'affecte à un destinataire via une interface mobile, et ce destinataire reçoit une notification puis récupère son colis en tapant son code personnel devant le meuble. Pas de clé, pas de badge obligatoire, pas d'attente.

Le système est conçu pour un usage intérieur, dans un environnement de confiance. Il ne prétend pas à une sécurité de niveau industriel. L'objectif est la praticité et la traçabilité légère, pas le coffre-fort.

Le meuble support est une étagère **IKEA Kallax 4×2** (8 casiers), chaque case étant équipée d'une porte, d'une serrure solénoïde et d'un anneau LED pour communiquer l'état au gestionnaire comme au destinataire.

---

## Architecture

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────┐
│                   Raspberry Pi 4                    │
│              Home Assistant OS                      │
│                                                     │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────┐   │
│  │  ESPHome    │  │  MQTT    │  │  Automations  │   │
│  │  (firmware) │  │  broker  │  │  Scripts      │   │
│  └──────┬──────┘  └────┬─────┘  └───────────────┘   │
└─────────┼──────────────┼────────────────────────────┘
          │ WiFi         │ WiFi
          ▼              ▼
┌─────────────────────────────────────────────────────┐
│           Carte LC-Relay-ESP32-8R-D5                │
│                                                     │
│  8 relais (mode impulsionnel)                       │
│  GPIO libres → reed switches × 8                    │
│  GPIO libres → anneaux LED NeoPixel × 8             │
└──────────────────────┬──────────────────────────────┘
                       │ 12V / signal
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    Serrures ×8   Reed switch ×8   LED ring ×8
    solénoïde     MC-38            WS2812B 12 LEDs
    12V DC        (état porte)     (état casier)
```

### Composants matériels

| Composant | Référence | Rôle |
|---|---|---|
| Meuble | IKEA Kallax 4×2 | Support 8 casiers |
| Cerveau | Raspberry Pi 4 | Home Assistant OS |
| Interface utilisateur | Tablette Android | Dashboard HA en mode kiosk |
| Contrôleur | LC-Relay-ESP32-8R-D5 | ESP32 + 8 relais intégrés |
| Serrure | Solénoïde 12V (B07KWMH16C) | Verrouillage casier |
| Détection porte | Reed switch MC-38 | État physique porte |
| Signalétique | Anneau NeoPixel WS2812B 12 LEDs | Retour visuel par casier |
| Alimentation | 12V DC switching 3A | Serrures + carte ESP32 |
| Urgence | Bouton poussoir NO protégé | Bypass hardware tout ouvrir |

### Alimentation

```
230V AC (prise murale)
    └── Réglette 3 sorties
            ├── Alim 12V/3A  → carte ESP32 + serrures
            ├── Alim USB-C 5V/3A → Raspberry Pi 4
            └── Chargeur USB → Tablette Android
```

Le bouton d'urgence est câblé en **bypass hardware direct** sur le +12V des serrures, indépendamment de l'ESP32 et de Home Assistant. Il fonctionne même en cas de panne logicielle.

### Couche logicielle

| Brique | Rôle |
|---|---|
| **ESPHome** | Firmware ESP32 : relais en mode impulsionnel, lecture reed switches, pilotage NeoPixel |
| **Home Assistant** | États casiers, attribution, dashboard, automatisations, notifications |
| **Lovelace** | Interface admin (tablette) et interface utilisateur (digicode) |
| **notify.smtp** | Notification email au destinataire lors du dépôt |

### États d'un casier

```
LIBRE  ──(dépôt)──▶  OCCUPÉ  ──(attribution)──▶  EN ATTENTE
                                                       │
                                              (code correct)
                                                       │
                                                       ▼
                                        OUVERT ──(refermeture)──▶  LIBRE
```

### Code couleur anneau LED

| Couleur | État |
|---|---|
| 🟢 Vert | Libre |
| 🔵 Bleu | Occupé - destinataire notifié |
| 🟠 Orange | Code saisi - ouverture en cours |
| ⚪ Blanc clignotant | Porte ouverte - récupération en cours |
| 🔴 Rouge | Erreur / code incorrect |

### Sécurité

Le système est conçu pour un usage intérieur en environnement de confiance (réseau local uniquement). Les codes PIN des utilisateurs sont stockés dans des helpers Home Assistant. Aucune exposition sur internet n'est prévue en V1.
