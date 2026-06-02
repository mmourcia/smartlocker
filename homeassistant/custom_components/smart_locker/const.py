DOMAIN = "smart_locker"
NUM_LOCKERS = 8

# Etats metier d'un casier (independants de l'etat physique de la porte)
STATE_FREE = "libre"
STATE_OCCUPIED = "occupé"
STATE_WAITING = "en_attente"
STATE_RETRIEVED = "récupéré"
STATE_ERROR = "hors_service"

LOCKER_STATES = [STATE_FREE, STATE_OCCUPIED, STATE_WAITING, STATE_RETRIEVED, STATE_ERROR]

# Services
SERVICE_ASSIGN = "assign"
SERVICE_UNASSIGN = "unassign"
SERVICE_OPEN = "open"
SERVICE_NOTIFY = "notify"
SERVICE_RESET = "reset"

# Attributs de service
ATTR_LOCKER_ID = "locker_id"
ATTR_USER = "user"

# Configuration
CONF_PIN_SENSOR = "pin_sensor"
DEFAULT_PIN_SENSOR = "sensor.smart_locker_digicode_code_pin_digicode"

# Entites ESPHome - noms generés par l'intégration ESPHome
ESPHOME_BUTTON_OPEN = "button.smart_locker_relais_ouvrir_casier_{}"
ESPHOME_DOOR_SENSOR = "binary_sensor.smart_locker_relais_porte_casier_{}"

# Stockage persistant des destinataires
STORE_KEY_RECIPIENTS = "smart_locker_recipients"
STORE_VERSION = 1

# Commandes WebSocket CRUD destinataires
WS_RECIPIENTS_LIST   = "smart_locker/recipients/list"
WS_RECIPIENTS_ADD    = "smart_locker/recipients/add"
WS_RECIPIENTS_UPDATE = "smart_locker/recipients/update"
WS_RECIPIENTS_DELETE = "smart_locker/recipients/delete"

# Commandes WebSocket paramètres
WS_SETTINGS_GET = "smart_locker/settings/get"
WS_SETTINGS_SET = "smart_locker/settings/set"

DEFAULT_NOTIFICATION_TITLE = "Colis mis à disposition à la pharmacie"
