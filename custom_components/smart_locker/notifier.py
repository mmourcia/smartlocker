"""Envoi des notifications aux destinataires : email (SMTP) et SMS (SMSFactor) integres.

Les anciens services notify YAML (platform: smtp / rest) sont abandonnes par Home Assistant et
les nouvelles entites notify n'acceptent pas de destinataire. Le composant envoie donc lui-meme,
a l'adresse et au mobile saisis dans la carte Destinataires.

Canaux d'un destinataire :
- "email" / "sms" : envoi integre si configure (carte Messages) ; sinon, transition, via les
  anciens services HA du destinataire (legacy_services) ;
- notify_services : autres services HA (app mobile Companion…), appeles sans destinataire.
"""
import asyncio
import logging
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid

import aiohttp
import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.util import dt as dt_util
from homeassistant.util.ssl import client_context

from .const import (
    DOMAIN,
    CHANNEL_EMAIL,
    CHANNEL_SMS,
    CHANNELS,
    SMTP_DEFAULTS,
    SMS_DEFAULTS,
    WS_CHANNELS_GET,
    WS_CHANNELS_SET,
    WS_CHANNELS_TEST,
)

_LOGGER = logging.getLogger(__name__)

_EMAIL_HINTS = ("smtp", "mail", "gmail", "imap", "email")
_SECRETS = {CHANNEL_EMAIL: "password", CHANNEL_SMS: "token"}


def service_kind(service: str) -> str:
    """Type d'un service notify HA d'apres son nom : email, sms ou other."""
    name = service.lower()
    if any(h in name for h in _EMAIL_HINTS):
        return CHANNEL_EMAIL
    if "sms" in name:
        return CHANNEL_SMS
    return "other"


def split_services(services: list[str]) -> tuple[set[str], list[str], list[str]]:
    """Services notify HA -> (canaux deduits, anciens services email/sms, autres services)."""
    return (
        {service_kind(s) for s in services} & set(CHANNELS),
        [s for s in services if service_kind(s) in CHANNELS],
        [s for s in services if service_kind(s) == "other"],
    )


def migrate_recipient(recipient: dict) -> bool:
    """Ancien format (notify_services uniquement) -> canaux. Retourne True si modifie."""
    if "channels" in recipient:
        return False
    channels, legacy, others = split_services(recipient.get("notify_services", []))
    recipient["channels"] = sorted(channels)
    recipient["legacy_services"] = legacy
    recipient["notify_services"] = others
    return True


def normalize_mobile(number: str) -> str:
    """Format international attendu par SMSFactor : 0612345678 -> 33612345678."""
    digits = re.sub(r"[^\d+]", "", number or "")
    if digits.startswith("+"):
        digits = digits[1:]
    elif digits.startswith("00"):
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 10:
        digits = "33" + digits[1:]
    return digits


class NotifyError(Exception):
    """Echec d'envoi, avec un message lisible pour la carte."""


class Notifier:

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        # Diagnostic : resultat du dernier envoi par canal
        self.last: dict[str, dict] = {CHANNEL_EMAIL: {}, CHANNEL_SMS: {}}

    @property
    def _settings(self) -> dict:
        return self.hass.data[DOMAIN]["settings"]

    def config(self, channel: str) -> dict:
        defaults = SMTP_DEFAULTS if channel == CHANNEL_EMAIL else SMS_DEFAULTS
        return {**defaults, **self._settings.get(channel, {})}

    def configured(self, channel: str) -> bool:
        cfg = self.config(channel)
        if channel == CHANNEL_EMAIL:
            return bool(cfg["server"] and cfg["sender"])
        return bool(cfg["url"] and cfg["token"])

    def _record(self, channel: str, error: str | None) -> None:
        now = dt_util.utcnow().isoformat()
        self.last[channel] = {"at": now, "error": error}

    # ── Email ───────────────────────────────────────────────────────────────

    async def send_email(self, to: str, subject: str, text: str, html: str | None) -> None:
        cfg = self.config(CHANNEL_EMAIL)
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((cfg["sender_name"], cfg["sender"])) if cfg["sender_name"] else cfg["sender"]
        msg["To"] = to
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid()
        msg.attach(MIMEText(text, "plain", "utf-8"))
        if html:
            msg.attach(MIMEText(html, "html", "utf-8"))
        context = client_context()

        def _send() -> None:
            if cfg["encryption"] == "ssl":
                server = smtplib.SMTP_SSL(cfg["server"], cfg["port"], timeout=15, context=context)
            else:
                server = smtplib.SMTP(cfg["server"], cfg["port"], timeout=15)
            try:
                if cfg["encryption"] == "starttls":
                    server.starttls(context=context)
                if cfg["username"]:
                    server.login(cfg["username"], cfg["password"])
                server.sendmail(cfg["sender"], [to], msg.as_string())
            finally:
                try:
                    server.quit()
                except smtplib.SMTPException:
                    pass

        try:
            await self.hass.async_add_executor_job(_send)
        except smtplib.SMTPAuthenticationError as err:
            self._record(CHANNEL_EMAIL, "identifiants refusés")
            raise NotifyError(
                "Identifiants SMTP refusés (Gmail : utiliser un mot de passe d'application)"
            ) from err
        except (smtplib.SMTPException, OSError) as err:
            self._record(CHANNEL_EMAIL, str(err) or type(err).__name__)
            raise NotifyError(f"Envoi SMTP impossible : {err or type(err).__name__}") from err
        self._record(CHANNEL_EMAIL, None)

    # ── SMS ─────────────────────────────────────────────────────────────────

    async def send_sms(self, to: str, text: str) -> None:
        cfg = self.config(CHANNEL_SMS)
        token = cfg["token"].strip()
        if not token.lower().startswith("bearer "):
            token = f"Bearer {token}"
        params = {"text": text, "to": normalize_mobile(to), "pushtype": "alert"}
        if cfg["sender"]:
            params["sender"] = cfg["sender"]
        try:
            session = async_get_clientsession(self.hass)
            async with session.get(
                cfg["url"], params=params,
                headers={"Authorization": token, "Accept": "application/json"},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                body = await resp.json(content_type=None)
                resp.raise_for_status()
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError) as err:
            self._record(CHANNEL_SMS, str(err) or type(err).__name__)
            raise NotifyError(f"Envoi SMS impossible : {err or type(err).__name__}") from err
        # SMSFactor repond en HTTP 200 meme en cas d'erreur : statut 1 = OK
        if not isinstance(body, dict) or body.get("status") != 1:
            detail = body.get("message") or body.get("details") if isinstance(body, dict) else body
            self._record(CHANNEL_SMS, str(detail))
            raise NotifyError(f"SMSFactor a refusé l'envoi : {detail}")
        self._record(CHANNEL_SMS, None)

    # ── Envoi a un destinataire ─────────────────────────────────────────────

    async def async_notify(self, recipient: dict, title: str, text: str, html: str) -> tuple[bool, list[str]]:
        """Envoie sur tous les canaux du destinataire. Retourne (au moins un envoi, erreurs)."""
        sent, errors = False, []
        name = f"{recipient.get('first_name', '')} {recipient.get('last_name', '')}".strip()
        email, mobile = recipient.get("email", ""), recipient.get("mobile", "")
        channels = recipient.get("channels", [])
        legacy = recipient.get("legacy_services", [])

        async def attempt(label: str, coro) -> None:
            nonlocal sent
            try:
                await coro
                sent = True
                _LOGGER.info("%s envoyé à %s", label, name)
            except NotifyError as err:
                errors.append(f"{label} : {err}")
                _LOGGER.error("%s pour %s : %s", label, name, err)
            except Exception as err:  # service HA en erreur
                errors.append(f"{label} : {err}")
                _LOGGER.error("%s pour %s : %s", label, name, err)

        for channel, address in ((CHANNEL_EMAIL, email), (CHANNEL_SMS, mobile)):
            if channel not in channels:
                continue
            if not address:
                errors.append(f"{channel} : coordonnée manquante")
                _LOGGER.warning("%s : canal %s coché mais coordonnée manquante", name, channel)
                continue
            if self.configured(channel):
                if channel == CHANNEL_EMAIL:
                    await attempt("Email", self.send_email(address, title, text, html))
                else:
                    await attempt("SMS", self.send_sms(address, text))
                continue
            # Transition : anciens services YAML du destinataire pour ce canal
            olds = [s for s in legacy if service_kind(s) == channel]
            if not olds:
                errors.append(f"{channel} : envoi non configuré (carte Messages)")
                _LOGGER.warning("%s : canal %s non configuré", name, channel)
            for svc in olds:
                data = {"title": title, "message": text, "target": [address]}
                if channel == CHANNEL_EMAIL:
                    data["data"] = {"html": html}
                await attempt(f"notify.{svc}",
                              self.hass.services.async_call("notify", svc, data, blocking=True))

        # Autres services HA (app mobile…) : deja adresses, appeles sans destinataire
        for svc in recipient.get("notify_services", []):
            await attempt(f"notify.{svc}", self.hass.services.async_call(
                "notify", svc, {"title": title, "message": text}, blocking=True))
        return sent, errors

    # ── Diagnostic ──────────────────────────────────────────────────────────

    def public_config(self) -> dict:
        """Configuration sans les secrets (envoyee au navigateur)."""
        out = {}
        for channel in CHANNELS:
            cfg = dict(self.config(channel))
            secret = _SECRETS[channel]
            cfg[f"has_{secret}"] = bool(cfg.pop(secret))
            cfg["configured"] = self.configured(channel)
            cfg["last"] = self.last[channel]
            out[channel] = cfg
        return out


# ── API WebSocket (carte Messages, section Envoi) ───────────────────────────

def async_setup_notifier_ws(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_get)
    websocket_api.async_register_command(hass, ws_set)
    websocket_api.async_register_command(hass, ws_test)


@websocket_api.websocket_command({vol.Required("type"): WS_CHANNELS_GET})
@websocket_api.async_response
async def ws_get(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    connection.send_result(msg["id"], hass.data[DOMAIN]["notifier"].public_config())


@websocket_api.websocket_command({
    vol.Required("type"): WS_CHANNELS_SET,
    vol.Required("channel"): vol.In(CHANNELS),
    # Email
    vol.Optional("server"): str,
    vol.Optional("port"): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
    vol.Optional("encryption"): vol.In(["starttls", "ssl", "none"]),
    vol.Optional("username"): str,
    vol.Optional("password"): str,     # vide = inchange
    vol.Optional("sender_name"): str,
    # SMS
    vol.Optional("url"): str,
    vol.Optional("token"): str,        # vide = inchange
    # Commun
    vol.Optional("sender"): str,
    vol.Optional("clear_secret", default=False): bool,
})
@websocket_api.async_response
async def ws_set(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    from .recipients import async_save  # import local : evite un cycle

    channel = msg["channel"]
    defaults = SMTP_DEFAULTS if channel == CHANNEL_EMAIL else SMS_DEFAULTS
    settings = hass.data[DOMAIN]["settings"]
    cfg = {**defaults, **settings.get(channel, {})}
    secret = _SECRETS[channel]
    for key in defaults:
        if key not in msg:
            continue
        if key == secret and not msg[key]:
            continue  # champ masque laisse vide : on garde le secret enregistre
        cfg[key] = msg[key].strip() if isinstance(msg[key], str) else msg[key]
    if msg["clear_secret"]:
        cfg[secret] = ""
    if channel == CHANNEL_SMS and cfg["sender"] and len(cfg["sender"]) > 11:
        connection.send_error(msg["id"], "invalid_format", "Expéditeur SMS : 11 caractères maximum")
        return
    settings[channel] = cfg
    await async_save(hass)
    connection.send_result(msg["id"], hass.data[DOMAIN]["notifier"].public_config())


@websocket_api.websocket_command({
    vol.Required("type"): WS_CHANNELS_TEST,
    vol.Required("channel"): vol.In(CHANNELS),
    vol.Required("to"): vol.All(str, vol.Length(min=3)),
})
@websocket_api.async_response
async def ws_test(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Envoie un message de test (contenu de la carte Messages, destinataire d'exemple)."""
    from .messages import render_sample

    notifier: Notifier = hass.data[DOMAIN]["notifier"]
    if not notifier.configured(msg["channel"]):
        connection.send_error(msg["id"], "not_configured", "Canal non configuré : enregistrer d'abord")
        return
    rendered = render_sample(hass)
    title = f"[Test] {rendered['notification_title']}"
    try:
        if msg["channel"] == CHANNEL_EMAIL:
            await notifier.send_email(msg["to"], title, rendered["msg_text"], rendered["msg_email_html"])
        else:
            await notifier.send_sms(msg["to"], rendered["msg_text"])
    except NotifyError as err:
        connection.send_error(msg["id"], "send_failed", str(err))
        return
    connection.send_result(msg["id"], {"success": True})
