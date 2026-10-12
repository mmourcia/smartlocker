DOMAIN = "smart_locker"

# Kallax 4x2 = 8 cases. La case 3 est le compartiment technique (electronique,
# alimentation) : pas de serrure, pas de reed switch, pas de relais cable.
TECHNICAL_LOCKERS = (3,)
LOCKER_IDS = tuple(i for i in range(1, 9) if i not in TECHNICAL_LOCKERS)

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

# Configuration YAML (obsolete : le PIN est desormais recu par evenement)
CONF_PIN_SENSOR = "pin_sensor"

# Evenements emis par le digicode ESPHome (smartlocker-digicode.yaml)
EVENT_CODE_ENTERED = "esphome.keypad_code_entered"
EVENT_KEY_PRESSED = "esphome.keypad_key_pressed"
# esphome.tag_scanned est converti par HA en scan de tag natif -> evenement "tag_scanned"
EVENT_TAG_SCANNED = "tag_scanned"

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

# Commandes WebSocket eclairage
WS_LEDS_DEVICES = "smart_locker/leds/devices"
WS_LEDS_TEST = "smart_locker/leds/test"

DEFAULT_NOTIFICATION_TITLE = "Colis mis à disposition à la pharmacie"

# Eclairage WLED - segment WLED de chaque case (cf. wled/presets.json, preset 1)
LED_SEGMENTS = {i: i - 1 for i in range(1, 9)}
LED_ACCESS_SECONDS = 8   # clignotement vert du casier qui s'ouvre
LED_ERROR_SECONDS = 3    # clignotement rouge sur code incorrect
LED_BLINK_SPEED = 170
FX_SOLID = 0
FX_BLINK = 1
COLOR_GREEN = [0, 255, 0]
COLOR_BLUE = [0, 75, 255]
COLOR_RED = [255, 0, 0]
COLOR_ORANGE = [255, 110, 0]

DEFAULT_SETTINGS = {
    "notification_title": DEFAULT_NOTIFICATION_TITLE,
    "led_entry_id":       "",    # config entry de l'integration WLED
    "led_brightness":     190,   # 1-255
    "led_timeout":        30,    # s d'eclairage apres la derniere activite
    "door_alert_delay":   60,    # s de porte ouverte avant alerte orange
}
