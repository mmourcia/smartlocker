# Backend Python — Logique métier

> **Statut : à venir.** Cette section sera complétée quand le backend sera développé.

## Motivation

Les automatisations Home Assistant YAML atteignent leurs limites pour :
- La vérification des codes PIN (logique conditionnelle complexe sur N casiers × M utilisateurs)
- La gestion des états métier avec transitions validées
- L'historisation des événements (qui a ouvert quoi, quand)
- Une future API REST pour piloter le système depuis une app mobile

## Architecture envisagée

```
Home Assistant
    │  webhooks / MQTT / WS
    ▼
Backend Python (FastAPI ou Flask)
    ├── Gestion des casiers (états, attribution, historique)
    ├── Gestion des utilisateurs (PIN hashé, préférences)
    ├── Vérification PIN (bcrypt)
    └── Notifications (email, push)
    │
    ▼
SQLite (ou PostgreSQL si volumétrie)
```

## Interactions avec Home Assistant

Le backend peut interagir avec HA de plusieurs façons :

| Mécanisme | Sens | Usage |
|---|---|---|
| Webhook HA | HA → Backend | Transmettre le code saisi par le digicode |
| REST API HA | Backend → HA | Déclencher ouverture (`button.press`), changer LED |
| MQTT | Bidirectionnel | Bus événements temps réel |
| Long-lived token HA | Auth | Token d'accès pour l'API HA |

## Structure de projet envisagée

```
backend/
├── app/
│   ├── main.py          # Point d'entrée FastAPI
│   ├── models.py        # Modèles SQLAlchemy (Casier, Utilisateur, Événement)
│   ├── api/
│   │   ├── lockers.py   # Endpoints casiers
│   │   └── users.py     # Endpoints utilisateurs
│   ├── services/
│   │   ├── pin.py       # Vérification PIN, hash bcrypt
│   │   ├── ha_client.py # Client API Home Assistant
│   │   └── notify.py    # Notifications email/push
│   └── config.py        # Variables d'environnement
├── tests/
├── requirements.txt
└── .env.example
```

## Sécurité

- Les PIN seront stockés hashés avec **bcrypt** (pas en clair comme dans les helpers HA V1)
- Le backend tourne en local sur le Raspberry Pi, pas exposé sur internet
- Authentification par token entre HA et le backend

## Déploiement sur le Raspberry Pi

Le backend tournera probablement comme un **add-on Home Assistant** ou un service systemd,
en parallèle de Home Assistant OS.
