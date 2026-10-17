"""The WhatsApp invite, shared by the Meta and Twilio routes in bot.py.

The bot is the real version of the app's mock WhatsApp screen (#/wa): one
message with the "wa.m2" greeting from app/i18n.js and an "Open Fenster" link
that goes straight to the app's first onboarding screen (#/ob/1). Onboarding,
the game and the daily-challenge opt-in all happen in the app. The bot never
calls Claude and never passes what people type to any AI.

turn() returns a list of messages: {"text", "link": button label, "url"}.
An empty list means: stay silent (the sender replied STOP).
Language and opt-outs are kept in memory only.
"""
import os
import threading

TEXT = {
    "en": {
        "invite": "Hello{name}! 👋 Learn about AI in 5 minutes a day: with games, together with your family.",
        "bot": "I'm an automated assistant.{contact} Reply STOP to stop.",
        "contact": " Questions: {c}.",
        "cta": "Open Fenster",
        "again": "Here is your link to Fenster again 👇",
        "help": "You can reach our team here: {c}",
        "help_none": "Please ask the person who sent you this link.",
        "stopped": "OK, you won't get any more messages from us. Reply START if you change your mind.",
    },
    "de": {
        "invite": "Hallo{name}! 👋 Lernen Sie KI in 5 Minuten am Tag kennen: spielerisch und zusammen mit Ihrer Familie.",
        "bot": "Ich bin ein automatischer Assistent.{contact} Antworten Sie STOP zum Abmelden.",
        "contact": " Fragen: {c}.",
        "cta": "Fenster öffnen",
        "again": "Hier ist Ihr Link zu Fenster noch einmal 👇",
        "help": "Unser Team erreichen Sie hier: {c}",
        "help_none": "Bitte fragen Sie die Person, die Ihnen den Link geschickt hat.",
        "stopped": "In Ordnung, Sie bekommen keine Nachrichten mehr von uns. Antworten Sie START, wenn Sie es sich anders überlegen.",
    },
}
GREETINGS = {"hi", "hello", "hey", "hallo", "start", "moin", "servus"}
GERMAN_WORDS = {"hallo", "guten", "tag", "morgen", "abend", "ja", "danke", "bitte", "moin", "servus", "gruss", "grüß",
                "grüss", "nein", "wie", "ich", "hilfe", "stopp", "abmelden"}
STOP_WORDS = {"stop", "stopp", "abmelden", "unsubscribe"}
HELP_WORDS = {"help", "human", "hilfe", "mensch"}

_users = {}  # sender -> language of the invite we sent
_opted_out = set()  # senders who replied STOP: we stay silent until they write START
_lock = threading.Lock()


def words_of(text):
    return "".join(c if c.isalnum() else " " for c in text.lower()).split()


def app_link(game_url, lang):
    return f"{game_url.rstrip('/')}/app/?lang={lang}#/ob/1"


def turn(sender, text, name, game_url):
    """One incoming message -> the invite, the link again, help, the STOP confirmation, or silence."""
    contact = os.getenv("TEAM_CONTACT", "").strip()
    words = words_of(text)
    first = words[0] if words else ""
    with _lock:
        lang = _users.get(sender) or ("de" if GERMAN_WORDS & set(words) else "en")
        t = TEXT[lang]
        if sender in _opted_out:
            if first != "start":
                return []
            _opted_out.discard(sender)
            _users.pop(sender, None)
        if first in STOP_WORDS:
            _opted_out.add(sender)
            return [{"text": t["stopped"]}]
        if first in HELP_WORDS:
            return [{"text": t["help"].format(c=contact) if contact else t["help_none"]}]
        if sender not in _users or first in GREETINGS:
            lang = "de" if GERMAN_WORDS & set(words) else "en"
            _users[sender] = lang
            t = TEXT[lang]
            greeting = t["invite"].format(name=f" {name.strip()}" if name and name.strip() else "")
            note = t["bot"].format(contact=t["contact"].format(c=contact) if contact else "")
            return [{"text": f"{greeting}\n\n{note}", "link": t["cta"], "url": app_link(game_url, lang)}]
        return [{"text": t["again"], "link": t["cta"], "url": app_link(game_url, lang)}]
