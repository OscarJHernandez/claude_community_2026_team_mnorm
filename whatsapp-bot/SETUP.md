# WhatsApp bot · setup guide

The bot is the front door of the **Fenster** app. Someone writes "Hi" (or "Hallo") on WhatsApp and gets ONE invite
(`invite.py`, the same on Meta and Twilio): "Hello {their WhatsApp name}! 👋 Learn about AI in 5 minutes a day:
with games, together with your family." (the app's `wa.m2` text) plus an **Open Fenster** link. The link goes
straight to the app's first onboarding screen: `<GAME_URL>/app/?lang=en#/ob/1` (`lang=de` and German text if the
first message looks German). Onboarding, the game and the daily-challenge opt-in all happen in the app.
Under the greeting: "I'm an automated assistant. Questions: {TEAM_CONTACT}. Reply STOP to stop." (set
`TEAM_CONTACT` in `.env`; without it the "Questions" part is left out). **help / Hilfe** gets the team contact,
**STOP / Stopp / Abmelden** gets one confirmation and then silence until **START**; anything else gets the link
again. The bot never calls Claude and never sends what people type to any AI. Nothing is stored on disk, and logs
mask phone numbers. On Meta it answers the webhook at once and sends in the background, ignores status callbacks,
skips duplicate message ids, and replies to users without a visible number through their business-scoped ID.

On Meta the link is a tappable button; on Twilio it's a plain link.

Steps marked 👤 have to be done by a person (log in, accept terms, type codes, copy tokens).
Everything else is copy-paste.

> ✅ **Status on 2026-10-17 (demo day): Twilio Sandbox works end to end from a real phone** ("Hi" → invite with
> the Fenster link). **Meta is only half there:** the app, token and webhook are set up and Meta's webhook check
> reached the bot, but while the Meta app is **unpublished** Meta delivers no real messages to the webhook, and
> sends from the bot fail with error 131030 even to a listed number. See "Meta in test mode" in the Gotchas.
> For the demo, use Twilio.

---

## 1. Which path? → Meta Cloud API test number

| | **Meta Cloud API test number** (recommended) | **Twilio Sandbox** (plan B) |
|---|---|---|
| Accounts | Facebook account + Meta developer registration; a business portfolio is created during the flow | Twilio account (free trial) |
| Time to the first bot reply | **25–35 min** | **10–15 min** |
| Who can chat with the bot | Up to **5 phone numbers** you add and confirm with a code | Anyone who sends `join <code>` to the sandbox number |
| Buttons | Real **link button**, plus up to 3 **reply buttons under a video** | Text and links only in this bot (buttons would need Twilio Content templates) |
| What the chat looks like | Our own chat named "Test Number" | Shared Twilio sandbox number with Twilio branding |
| Token | Temporary token lasts **about 24 h**; a system-user token can be set to never expire | No keys needed for this bot's replies |
| Time limits | Free-form replies only within 24 h of the user's last message | Same 24 h window, and the `join` expires after **3 days** |
| Cost today | Free | Trial credit |

**Why Meta:** older adults should tap big buttons, not type "1, 2, 3". Only the Meta path gives us real
buttons and a video with reply buttons, and the chat doesn't show "Twilio Sandbox" or a join code on camera.
It costs about 15 extra minutes of clicking.

**When to switch to Twilio:** if Meta registration or app creation blocks you for more than **15 minutes**
(code not arriving, "you can't create apps right now", business portfolio errors). The same `bot.py` handles both.

**What actually happened today:** Meta's 2026 dashboard holds real messages back from unpublished apps (see
Gotchas), so "Hi → reply" on Meta needs a published app (privacy policy URL, icon, category, then Publish).
Twilio Sandbox needs no publishing, so the demo runs on Twilio. Meta stays wired up for after publishing.

### Time plan (it's 13:40, feature freeze at 15:00)
| Step | Minutes |
|---|---|
| 👤 Meta developer registration (steps 1–2) | 5–10 |
| 👤 App, test number, recipient numbers (steps 3–5) | 10 |
| Bot + tunnel + webhook (steps 6–8) | 10 |
| Test on the phone (step 9) | 5 |
| **Total** | **≈30 min** (start now, done by ~14:15) |

---

## 2. What you need
- A laptop with **Python 3.10+** (the team Mac has 3.11).
- A **phone with WhatsApp** for the demo. Its number becomes a test recipient.
- A **Facebook account** you can log in to (for Meta), or an email + phone for Twilio.
- The **game link** (`GAME_URL`): the public web address of our web app. It must be `https://` and open from
  the internet, not `localhost`.

---

## 3. Meta Cloud API: step by step

1. 👤 **Register as a Meta developer.** Log in to Facebook, open <https://developers.facebook.com/async/registration>,
   accept the terms, and confirm your phone number and email with the codes Meta sends. Pick any occupation.
   ([docs](https://developers.facebook.com/docs/development/register))

2. 👤 **Create the app.** Open <https://developers.facebook.com/apps> → **Create App** → name `Real or AI` +
   your email → use case **Connect with customers through WhatsApp** → **Next** → pick or create a
   **business portfolio** → **Create app**.
   ([docs](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started))

3. 👤 **API Setup page.** On the Quickstart page click **Start using the API**. If asked, connect or create a
   WhatsApp Business account (often it already exists). Then:
   - Click **Generate access token** and copy it. This becomes `WHATSAPP_TOKEN` (valid about 24 h).
   - Copy the **Phone number ID** of the test number (not the phone number itself). This becomes `WHATSAPP_PHONE_NUMBER_ID`.
   - Paste both straight into `whatsapp-bot/.env` (step 6). Never into chat, Slack, a screenshot or Git.

4. 👤 **Add the demo phone(s).** In the **To** field choose **Manage phone number list** → add the demo phone
   number with country code → type the code that arrives **in WhatsApp** on that phone. Up to 5 numbers.

5. 👤 **Open the chat.** Click **Send message**. The demo phone gets a "Hello World" message from
   **Test Number**. Open that chat and reply **Hi**. This opens the 24-hour reply window.

6. **Start the bot** (in a terminal, from the repo folder):
   ```bash
   cd whatsapp-bot
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   ```
   👤 Open `whatsapp-bot/.env` and fill in:
   - `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` from step 3
   - `WHATSAPP_VERIFY_TOKEN`: make up any word, for example `real-or-ai-2026`
   - `GAME_URL`: the public https base of the Fenster app (no path, see Gotchas)

   Then run:
   ```bash
   python bot.py
   ```
   It listens on `http://localhost:5050`. If some setting is missing, it prints the names of what's missing.

7. **Open a public tunnel** in a second terminal. We use Cloudflare's free quick tunnel, which needs **no
   account**. On a Mac without Homebrew (Apple Silicon; on Intel use `darwin-amd64`), first download it:
   ```bash
   mkdir -p ~/bin && cd ~/bin && curl -L -o cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz && tar -xzf cloudflared.tgz && chmod +x cloudflared
   ```
   Then start the tunnel:
   ```bash
   ~/bin/cloudflared tunnel --url http://localhost:5050
   ```
   With Homebrew it's simply `brew install cloudflared`. It prints a link like `https://some-words.trycloudflare.com`.
   Open it in a browser and you should see "Real or AI? WhatsApp bot is running."
   ([docs](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/),
   [downloads](https://github.com/cloudflare/cloudflared/releases))
   *ngrok also works (`ngrok http 5050`), but it needs a free account and an authtoken.*

8. 👤 **Connect the webhook.** In the App Dashboard go to **Use cases → Customize (WhatsApp) → Configuration**
   (older apps: **WhatsApp → Configuration**).
   - **Callback URL**: `https://some-words.trycloudflare.com/webhook`
   - **Verify token**: the same word as `WHATSAPP_VERIFY_TOKEN`
   - Click **Verify and save**. The bot and the tunnel must be running at that moment.
   - Under **Webhook fields**, find **messages** and click **Subscribe**.
   ([docs](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint))

9. **Test it.** On the demo phone, write **Hi** in the Test Number chat. Within a few seconds you get the
   **Fenster** card with your name and an **Open Fenster** button. Tap it and the app opens at its first
   onboarding screen in Safari or Chrome.

11. *Optional: a token that doesn't expire* (do it if the demo is recorded more than ~20 h after step 3).
    👤 [Business settings](https://business.facebook.com/settings) → **System users** → **Add** → select it →
    **Assign assets**: the app (**Manage app**, full control) and the WhatsApp account (full control) →
    **Generate token** with `whatsapp_business_messaging`, `whatsapp_business_management` and
    `business_management`, expiry **Never**. Put it in `WHATSAPP_TOKEN` and restart. About 5 minutes.

12. *Optional: signature check.* 👤 **App settings → Basic → App secret** → put it in `META_APP_SECRET`.
    The bot then rejects webhook calls that don't come from Meta.

---

## 4. Plan B: Twilio Sandbox (≈10–15 min)

Same invite as the Meta path, as one text message with a plain link. No Twilio keys are needed.

1. 👤 Sign up at <https://www.twilio.com/try-twilio> (confirm your email and phone).
2. 👤 Open **Messaging → Try it out → Send a WhatsApp message**
   (<https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn>). Twilio's docs say the sandbox
   lives in the classic Console, not the new one. Tick the terms box, click **Confirm**, and note your join code.
3. 👤 On each demo phone, send `join <your-code>` to **+1 415 523 8886** (or scan the QR code on that page).
4. Start the bot and the tunnel as in steps 6–7. Only `GAME_URL` is needed.
   If the Meta bot already runs on port 5050, start a second copy on 5051 with its own tunnel:
   ```bash
   PORT=5051 GAME_URL=https://your-fenster-tunnel .venv/bin/python bot.py
   ```
   ```bash
   ~/bin/cloudflared tunnel --no-autoupdate --url http://localhost:5051
   ```
5. 👤 In **Sandbox settings**, set **When a message comes in** to `https://some-words.trycloudflare.com/twilio`,
   method **POST**, then **Save**.
6. Write **Hi** (or **Hallo**) to the sandbox number. You get the invite with your WhatsApp name and the Fenster link.
7. *Optional: an "Open Fenster" button instead of the plain link.* Put `TWILIO_ACCOUNT_SID` and
   `TWILIO_AUTH_TOKEN` (Console home → **Account Info**) in `~/secrets.env` and restart the bot. It then sends the
   invite through the Content API (`twilio/call-to-action`, one URL button, allowed in the 24-hour session without
   approval). **This needs an upgraded (paid) Twilio account:** on Trial the Content API answers "not available on
   a Trial account", and the bot falls back to the plain link by itself.
   ([docs](https://www.twilio.com/docs/whatsapp/sandbox))

---

## 5. Test without any accounts
With the bot running (step 6, any made-up `WHATSAPP_VERIFY_TOKEN`), in another terminal:
```bash
curl "http://localhost:5050/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_WORD&hub.challenge=42"
```
It should print `42`. With a wrong word you get a 403 error. That is exactly the check Meta does in step 8.

---

## 6. Gotchas
- **Meta in test mode (found on 2026-10-17).** The 2026 dashboard says it plainly above the webhook form:
  unpublished apps only get *test* webhooks sent from the dashboard. Real messages, even from the app's own
  admins, are not delivered until the app is published. Also, sends from our API token failed with 131030 even
  though the number exactly matched the recipient list (a +7 number, so not the Argentina/Mexico format bug).
  To use Meta for real: App settings → Basic (privacy policy URL, icon, category) → Publish. An icon is ready at
  `whatsapp-bot/meta-app-icon-1024.png`.
- **Where the Meta webhook form is now:** Use cases → *Connect on WhatsApp* → Easy setup → Step 1 → "Set up
  Webhooks" (Callback URL + Verify token). The "Configurations" item in the main left menu belongs to *Facebook
  Login for Business*, not WhatsApp.
- **Claude in Chrome can't click on facebook.com or twilio.com on this Mac** (`Host access is restricted by
  policy`). It can open and read pages and sometimes fill a field; a person presses the buttons.
- **Error 190 / "token expired"**: the temporary token died (about 24 h). Generate a new one in API Setup,
  update `.env`, restart the bot. Or do step 11.
- **Error 131030 "Recipient phone number not in allowed list"**: add that number in step 4.
- **Error 131047 / nothing is delivered**: more than 24 h since that phone last wrote. Write "Hi" first.
- **Webhook verified, but the bot never reacts**: you didn't subscribe to **messages** (step 8). If it's still
  silent, subscribe the app to the WhatsApp account once (WABA ID = the WhatsApp Business Account ID on the API Setup page):
  ```bash
  set -a; source .env; set +a
  curl -X POST "https://graph.facebook.com/v26.0/<WABA_ID>/subscribed_apps" -H "Authorization: Bearer $WHATSAPP_TOKEN"
  ```
- **The tunnel link changes every time cloudflared restarts.** Then paste the new link into Meta (step 8) or
  Twilio (step 5 of plan B). Keep the tunnel running through the demo recording.
- **The game opens in Safari or Chrome, not inside WhatsApp.** WhatsApp's in-app browser is only for approved
  marketing or utility templates on big accounts. That's fine: say "it opens like any link".
- **`GAME_URL` must be public.** The web app needs its own tunnel (run a second `cloudflared` on its port) or
  hosting. Don't use free ngrok for the game, because it shows a warning page to browser visitors.
- **`GAME_URL` is the base of the Fenster app**, without a path: run `npm install && npm start` in the repo root
  (port 3000) and `~/bin/cloudflared tunnel --no-autoupdate --url http://localhost:3000`, then use that tunnel link.
  The bot adds `/app/?lang=..#/ob/1` itself.
- **Port 5000 is taken on Macs** (AirPlay Receiver). That's why the bot uses 5050.
- **Twilio**: a phone can be in one sandbox at a time; the join expires after 3 days (error 63015 → send
  `join` again); the sandbox sends at most 1 message every 3 seconds.
- **Never show tokens.** Hide the API Setup page while recording the demo. Meta also cancels tokens it finds in
  public places, like a public GitHub repo.
- Use only team members' phones. No real users' numbers in the repo or in the video.

---

## 7. 👤 Human-only checklist
Claude can't and shouldn't do these: they need your login, your phone or your consent.

**Meta path**
- [ ] Log in to Facebook and register as a Meta developer (phone + email codes, accept terms). Step 1
- [ ] Create the app and choose or create the business portfolio. Step 2
- [ ] Generate the access token and copy the token + Phone number ID into `whatsapp-bot/.env`. Step 3
- [ ] Add the demo phone number(s) and type the WhatsApp code. Step 4
- [ ] Send the hello_world message and reply "Hi" on the phone. Step 5
- [ ] Download cloudflared (or install it with Homebrew). Step 7
- [ ] Paste the callback URL + verify token, **Verify and save**, subscribe to **messages**. Step 8
- [ ] *(optional)* Create a system user and a never-expiring token. Step 11
- [ ] *(optional)* Copy the App secret into `.env`. Step 12

**Twilio plan B**
- [ ] Sign up for Twilio, activate the WhatsApp sandbox, note the join code.
- [ ] Send `join <code>` from each demo phone.
- [ ] Paste the `/twilio` webhook URL into Sandbox settings.

---

## 8. Files
| File | What it is |
|---|---|
| `bot.py` | The bot (Flask): `/webhook` for Meta, `/twilio` for plan B, `/` health check |
| `invite.py` | The invite both routes share: greeting with the WhatsApp name, Fenster link, STOP |
| `requirements.txt` | Python packages: Flask, requests, python-dotenv |
| `.env.example` | Names of all settings, empty. Copy to `.env` (git-ignored) and fill in |
| `SETUP.md` | This guide |

Settings are read from real environment variables first, then `whatsapp-bot/.env`, then `~/secrets.env`.

## Sources
- Meta: [Cloud API get started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started),
  [webhook endpoint](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint),
  [CTA URL button](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-cta-url-messages),
  [reply buttons](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-reply-buttons-messages),
  [developer registration](https://developers.facebook.com/docs/development/register),
  [token types (Meta blog)](https://developers.facebook.com/blog/post/2022/12/05/auth-tokens/)
- Twilio: [WhatsApp Sandbox](https://www.twilio.com/docs/whatsapp/sandbox), [buttons](https://www.twilio.com/docs/whatsapp/buttons)
- Cloudflare: [Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)
- The 5-recipient limit for the test number comes from third-party guides
  ([respond.io](https://respond.io/help/whatsapp/whatsapp-cloud-api)); Meta's current page doesn't state the number.
