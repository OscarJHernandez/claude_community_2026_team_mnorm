"""Real or AI? WhatsApp entry bot.

Someone writes to the bot on WhatsApp and gets one invite (invite.py): a greeting
with their WhatsApp name and an "Open Fenster" link to the app's first onboarding
screen. Onboarding, the game and the daily-challenge opt-in live in the app.

Two webhooks, same invite (see SETUP.md):
  /webhook  Meta WhatsApp Cloud API, recommended (a real link button)
  /twilio   Twilio Sandbox for WhatsApp, plan B (plain link)

Run: python bot.py
"""
import hashlib
import hmac
import json
import logging
import os
import re
import threading
from pathlib import Path
from xml.sax.saxutils import escape

import requests
from dotenv import load_dotenv
from flask import Flask, Response, abort, request

import invite

# Real environment variables win, then whatsapp-bot/.env, then ~/secrets.env.
load_dotenv(Path(__file__).with_name(".env"))
load_dotenv(Path.home() / "secrets.env")

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
APP_SECRET = os.getenv("META_APP_SECRET", "")
GRAPH_VERSION = os.getenv("GRAPH_API_VERSION") or "v26.0"
# Public https base of the Fenster app, e.g. https://some-words.trycloudflare.com
GAME_URL = os.getenv("GAME_URL", "")
PORT = int(os.getenv("PORT") or 5050)
NO_GAME_URL = "The Fenster link is not set up yet (GAME_URL)."
# Optional, for the Twilio "Open Fenster" button. Without them /twilio sends a plain link.
TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")

app = Flask(__name__)
seen_ids = set()  # Meta retries webhooks, so skip messages we already answered.


class HideVerifyToken(logging.Filter):
    """Flask's access log prints full URLs; keep the verify token out of it."""

    def filter(self, record):
        record.msg = re.sub(r"(hub[._]verify_token=)[^&\s\"]+", r"\1***", record.getMessage())
        record.args = None
        return True


logging.getLogger("werkzeug").addFilter(HideVerifyToken())


# ---------- Meta WhatsApp Cloud API ----------

def mask(user):
    """For logs: +49******123 instead of a full phone number or user ID."""
    return f"{user[:3]}******{user[-3:]}" if len(user) > 6 else "***"


def send(to, message):
    """Send one message through the Cloud API. Returns True on success.

    `to` is a phone number (wa_id) or, for users who hide their number, a
    business-scoped user ID (BSUID, like "DE.1349..."), which goes in `recipient`.
    """
    url = f"https://graph.facebook.com/{GRAPH_VERSION}/{PHONE_NUMBER_ID}/messages"
    address = {"to": to} if to.isdigit() else {"recipient": to}
    body = {"messaging_product": "whatsapp", "recipient_type": "individual", **address, **message}
    r = requests.post(url, json=body, headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"}, timeout=15)
    if not r.ok:
        # Common codes: 190 token expired, 131030 number not on the test
        # allowlist, 131047 more than 24h since the user last wrote to us.
        app.logger.error("Send to %s failed (%s): %s", mask(to), r.status_code, r.text[:500])
    return r.ok


def text(body):
    return {"type": "text", "text": {"body": body}}


def link_button(body, label, url):
    return {
        "type": "interactive",
        "interactive": {
            "type": "cta_url",
            "header": {"type": "text", "text": "Fenster"},
            "body": {"text": body},
            "action": {"name": "cta_url", "parameters": {"display_text": label, "url": url}},
        },
    }


def handle(user, msg, name=""):
    """Send the invite (or the link again) with a tappable "Open Fenster" button."""
    if not GAME_URL:
        send(user, text(NO_GAME_URL))
        return
    for m in invite.turn(user, msg.get("text", {}).get("body", ""), name, GAME_URL):
        send(user, link_button(m["text"], m["link"], m["url"]) if m.get("link") else text(m["text"]))


def signature_ok(raw_body, header):
    expected = "sha256=" + hmac.new(APP_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header)


@app.get("/webhook")
def verify_webhook():
    """Meta calls this once when you click "Verify and save" in the dashboard."""
    token = request.args.get("hub.verify_token", "")
    if request.args.get("hub.mode") == "subscribe" and VERIFY_TOKEN and hmac.compare_digest(token, VERIFY_TOKEN):
        return Response(request.args.get("hub.challenge", ""), mimetype="text/plain")
    abort(403)


@app.post("/webhook")
def meta_incoming():
    if APP_SECRET and not signature_ok(request.get_data(), request.headers.get("X-Hub-Signature-256", "")):
        abort(403)
    data = request.get_json(silent=True) or {}
    for entry in data.get("entry", []):
        for change in entry.get("changes", []):
            # Delivery and read receipts arrive as "statuses"; we only answer "messages".
            # Status callbacks have no "messages", so they never re-send the invite.
            value = change.get("value", {})
            contacts = value.get("contacts", [])
            for msg in value.get("messages", []):
                if msg.get("id") in seen_ids:
                    continue
                seen_ids.add(msg.get("id"))
                # Since April 2026 the phone number can be missing; then use the BSUID.
                contact = next((c for c in contacts if c.get("wa_id") and c.get("wa_id") == msg.get("from")),
                               contacts[0] if contacts else {})
                user = msg.get("from") or contact.get("wa_id") or msg.get("from_user_id") or contact.get("user_id")
                if not user:
                    continue
                app.logger.info("Incoming %s message from %s", msg.get("type"), mask(user))
                # Answer Meta right away; sending can take a few seconds.
                name = contact.get("profile", {}).get("name", "")
                threading.Thread(target=handle, args=(user, msg, name), daemon=True).start()
    return "ok"


# ---------- Twilio Sandbox (plan B) ----------

button_templates = {}  # (label, url) -> Twilio Content SID, created on first use
buttons_off = False  # set after the first failure, e.g. Content API is not on Trial accounts


def twilio_button_template(label, url):
    """A twilio/call-to-action Content template with one URL button.

    WhatsApp allows one URL button inside the 24-hour session without template approval.
    The body is a variable, so one template per label and link covers every greeting.
    """
    if (label, url) not in button_templates:
        r = requests.post("https://content.twilio.com/v1/Content", auth=(TWILIO_SID, TWILIO_TOKEN), timeout=15, json={
            "friendly_name": "fenster_open_button",
            "language": "de" if "lang=de" in url else "en",
            "variables": {"1": "Hello! 👋"},
            "types": {"twilio/call-to-action": {"body": "{{1}}", "actions": [{"type": "URL", "title": label, "url": url}]}},
        })
        r.raise_for_status()
        button_templates[(label, url)] = r.json()["sid"]
    return button_templates[(label, url)]


def twilio_send_button(to, sender, body, label, url):
    """Send the message with a tappable button through the Twilio REST API."""
    r = requests.post(f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json",
                      auth=(TWILIO_SID, TWILIO_TOKEN), timeout=15, data={
                          "To": to, "From": sender, "ContentSid": twilio_button_template(label, url),
                          "ContentVariables": json.dumps({"1": body})})
    r.raise_for_status()


@app.post("/twilio")
def twilio_incoming():
    """Twilio posts a form; we answer with TwiML.

    One message per turn (the sandbox sends at most 1 message every 3 seconds). With
    TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN set, the invite goes out with an "Open Fenster"
    button through the REST API; without them, or if that fails, as text with a plain link.
    """
    if not GAME_URL:
        return Response(f"<Response><Message><Body>{escape(NO_GAME_URL)}</Body></Message></Response>", mimetype="text/xml")
    user = request.form.get("From", "")
    messages = invite.turn(user, request.form.get("Body") or "", request.form.get("ProfileName", ""), GAME_URL)
    if not messages:  # the sender replied STOP: stay silent
        return Response("<Response/>", mimetype="text/xml")
    m = messages[0]
    global buttons_off
    if m.get("link") and TWILIO_SID and TWILIO_TOKEN and not buttons_off:
        try:
            twilio_send_button(user, request.form.get("To", ""), m["text"], m["link"], m["url"])
            return Response("<Response/>", mimetype="text/xml")
        except (requests.RequestException, KeyError) as err:
            detail = err.response.text if getattr(err, "response", None) is not None else str(err)
            app.logger.error("Twilio button failed, plain links from now on: %s", detail[:300])
            buttons_off = True
    reply = f"{m['text']}\n{m['link']}: {m['url']}" if m.get("link") else m["text"]
    twiml = f"<Response><Message><Body>{escape(reply)}</Body></Message></Response>"
    return Response(twiml, mimetype="text/xml")


@app.get("/")
def health():
    return "Real or AI? WhatsApp bot is running."


if __name__ == "__main__":
    required = ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN", "GAME_URL"]
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        print("Not set yet:", ", ".join(missing), "(the Twilio route only needs GAME_URL)")
    app.run(host="127.0.0.1", port=PORT)
