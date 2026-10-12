# Backend - Logique métier

> **Statut : réalisé sous forme de custom component Home Assistant.** Le backend Python séparé
> (FastAPI + SQLite) envisagé au départ n'a pas été retenu.

## Où vit la logique

Toute la logique métier est dans [`homeassistant/custom_components/smart_locker/`](../../homeassistant/custom_components/smart_locker/) :

| Fichier | Rôle |
|---|---|
| `const.py` | Constantes : casiers gérés (`LOCKER_IDS`, case 3 exclue), états, noms d'entités ESPHome |
| `entity.py` | `LockerEntity` : état métier, destinataires assignés (par id), PIN, horodatages, persistance |
| `__init__.py` | Setup, écoute du digicode, services `assign` / `unassign` / `notify` / `open` / `reset`, envoi des notifications |
| `recipients.py` | Stockage persistant des destinataires et paramètres, API WebSocket pour les cartes |
| `badges.py` | Attribution et enrôlement des badges |
| `messages.py` | Templates des notifications |
| `leds.py` | Pilotage de l'éclairage WLED |
| `www/smart-locker-card.js` | Cartes Lovelace `smart-locker-card` et `smart-locker-recipients-card` |

Documentation fonctionnelle : [intégrations](../home-assistant/integrations.md) et [dashboard](../home-assistant/dashboard.md).

## Pourquoi un custom component plutôt qu'un backend séparé

- Accès direct aux entités ESPHome (boutons, reed switches, digicode) sans token ni API REST.
- Notifications via les services `notify.*` déjà configurés dans HA.
- Pas de service supplémentaire à déployer ni à superviser.

## Limites actuelles

- Les PIN sont stockés en clair dans les attributs des entités (visibles dans HA).
- Pas d'historique dédié en dehors de l'historique HA des entités `smart_locker.casier_N`.
