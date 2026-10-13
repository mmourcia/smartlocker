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
SERVICE_SET_OUT_OF_SERVICE = "set_out_of_service"
ATTR_OUT_OF_SERVICE = "out_of_service"

# Attributs de service
ATTR_LOCKER_ID = "locker_id"
ATTR_USER = "user"                # nom « Prenom Nom » (compatibilite)
ATTR_RECIPIENT_ID = "recipient_id"

# Recuperation : la porte doit s'ouvrir dans ce delai apres l'impulsion relais
OPEN_CONFIRM_SECONDS = 30
EVENT_RETRIEVED = "smart_locker_retrieved"

# Configuration YAML (obsolete : le PIN est desormais recu par evenement)
CONF_PIN_SENSOR = "pin_sensor"

# Evenements emis par le digicode ESPHome (smartlocker-digicode.yaml)
EVENT_CODE_ENTERED = "esphome.keypad_code_entered"
EVENT_KEY_PRESSED = "esphome.keypad_key_pressed"
EVENT_KEYPAD_TIMEOUT = "esphome.keypad_timeout"
# Evenement dedie plutot que esphome.tag_scanned : HA convertit ce dernier en tag generique
# (evenement "tag_scanned"), declenchable par n'importe quel lecteur NFC de la maison.
EVENT_BADGE_SCANNED = "esphome.badge_scanned"

# Anciens entity_id fixes de la carte relais : derniere solution si aucun appareil n'est
# choisi ni detecte (cf. hardware.py)
ESPHOME_BUTTON_OPEN = "button.smart_locker_relais_ouvrir_casier_{}"
ESPHOME_DOOR_SENSOR = "binary_sensor.smart_locker_relais_porte_casier_{}"

# Stockage persistant des destinataires
STORE_KEY_RECIPIENTS = "smart_locker_recipients"
STORE_KEY_LOCKERS = "smart_locker_lockers"
STORE_VERSION = 1

# Commandes WebSocket CRUD destinataires
WS_RECIPIENTS_LIST   = "smart_locker/recipients/list"
WS_RECIPIENTS_ADD    = "smart_locker/recipients/add"
WS_RECIPIENTS_UPDATE = "smart_locker/recipients/update"
WS_RECIPIENTS_DELETE = "smart_locker/recipients/delete"

# Commandes WebSocket paramètres
WS_SETTINGS_GET = "smart_locker/settings/get"
WS_SETTINGS_SET = "smart_locker/settings/set"

# Commandes WebSocket badges et messages
WS_BADGES_ENROLL = "smart_locker/badges/enroll"
WS_BADGES_ASSIGN = "smart_locker/badges/assign"
WS_MESSAGES_PREVIEW = "smart_locker/messages/preview"
BADGE_ENROLL_SECONDS = 30

# Commandes WebSocket eclairage
WS_LEDS_DEVICES = "smart_locker/leds/devices"
WS_HARDWARE_STATUS = "smart_locker/hardware/status"
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

# Templates Jinja des messages (cf. messages.py)
TEMPLATE_KEYS = ("notification_title", "msg_text", "msg_email_html")

DEFAULT_MSG_TEXT = (
    "Bonjour {{ first_name }}, un colis a été déposé dans le casier {{ locker }}. "
    "Votre code PIN est {{ pin_formatted }}. "
    "Saisissez-le sur le digicode{% if has_badge %} ou présentez votre badge{% endif %} "
    "pour récupérer votre colis."
)

DEFAULT_MSG_EMAIL_HTML = """<html><body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#333;">
<h2 style="color:#2196F3;margin-bottom:4px;">📦 Un colis vous attend !</h2>
<p>Bonjour <strong>{{ first_name }}</strong>,</p>
<p>Un colis a été déposé dans le <strong>casier {{ locker }}</strong>.</p>
<p style="margin-bottom:6px;">Votre code PIN&nbsp;:</p>
<div style="text-align:center;margin:20px 0;">
<span style="font-size:2.8em;font-family:monospace;font-weight:bold;letter-spacing:10px;color:#1565C0;background:#E3F2FD;padding:14px 28px;border-radius:10px;display:inline-block;">{{ pin_formatted }}</span>
</div>
<p>Rendez-vous devant le meuble et saisissez ce code sur le digicode{% if has_badge %}, ou présentez votre badge{% endif %}.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
<p style="font-size:0.8em;color:#aaa;">Smart Locker</p>
</body></html>"""

DEFAULT_SETTINGS = {
    "notification_title": DEFAULT_NOTIFICATION_TITLE,
    "msg_text":           DEFAULT_MSG_TEXT,
    "msg_email_html":     DEFAULT_MSG_EMAIL_HTML,
    "relay_device_id":    "",    # appareil ESPHome de la carte relais (vide = detection auto)
    "keypad_device_id":   "",    # appareil ESPHome du digicode (vide = tous)
    "led_entry_id":       "",    # config entry de l'integration WLED
    "led_brightness":     190,   # 1-255
    "led_timeout":        30,    # s d'eclairage apres la derniere activite
    "door_alert_delay":   60,    # s de porte ouverte avant alerte orange
}
