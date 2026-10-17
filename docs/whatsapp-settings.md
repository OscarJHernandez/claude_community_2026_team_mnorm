# WhatsApp: settings beyond the bot setup guide

> **Plan update (14:40):** this was researched while the bot was meant to play clips in the chat. The plan changed: the bot now only sends the invite with an "Open Fenster" button, and the game, the AI labels and the scam checker live in the web app (`app/`). Items about sending clips in WhatsApp no longer apply; the red flags, the welcome-text rules, the webhook hygiene, the demo-phone prep and the "Nice for the demo" items about links, QR and sharing still do. "Real or AI?" below means the same project as "Real or Fake?" / Fenster.

This page covers WhatsApp settings, rules and platform changes that matter for Real or AI? after the bot is already running. The basic setup is in [whatsapp-bot/SETUP.md](../whatsapp-bot/SETUP.md) and is not repeated here. That guide covers the Meta app, tokens, the test number, the allowlist, the webhook, the tunnel, reply buttons and the common error codes. Everything below was checked against official sources on 17 Oct 2026. WhatsApp changes fast. Pricing changed on 1 Oct 2026, some of Meta's own pages disagree with each other, and some copies of Meta's docs that we could fetch were out of date. Before launch, check anything about pricing, usernames or the AI rules on the live page. Items marked "(not confirmed in Meta's docs)" rely on partner docs or our own reasoning. Endpoints are relative to the Graph API base URL the bot already uses. Meta's examples use v25.0. This is not legal advice.

## Red flags first

**1. Meta bans general-purpose AI assistants on WhatsApp (Terms §4.7, "AI Providers")**
- **What and why:** Meta's WhatsApp Business Platform Terms were last modified on 23 Sep 2026. They ban AI providers whose AI is the "primary (rather than incidental or ancillary)" function (Meta Terms §4.7). Meta alone decides who falls under this. Meta told TechCrunch that businesses using AI to serve their own customers are not affected. A quiz bot that explains the clip you just saw uses AI as a side feature. A free "ask Claude anything" chat inside WhatsApp looks like a general-purpose assistant.
- **Don't rely on the EU exception:** Meta stopped charging AI providers for EU/EEA users on 13 May 2026. On 9 Jun 2026 the European Commission ordered Meta to keep access open while its investigation runs. Meta has appealed, and we found no ruling yet. UK (+44) and Swiss (+41) numbers are not covered.
- **What to do:**
  - In WhatsApp, Claude only explains the current clip, in 2-3 sentences. Use a fixed system prompt and a low max_tokens.
  - Never pass a player's free text to Claude. Reply with a fixed message and the Play button instead (see Do today).
  - The "ask Claude your own question" card stays in the web app.
  - In the pitch, README and video, say "an AI-literacy quiz that uses Claude to explain", not "chat with Claude on WhatsApp".
  - §4.7 also forbids using WhatsApp data to train AI models. Never send thumbs-up/down feedback to Anthropic, and never opt WhatsApp-derived content into any Anthropic training program.
- **Who / time:** Code, plus whoever owns the pitch. 15-30 min. At launch, watch for the pricing category `AI_BOT` in Pricing Analytics, or `general_purpose_ai` in status webhooks. Either one means Meta has classified the number as an AI provider.

**2. AI-made clips must be labeled the first time people see them (EU AI Act Art. 50)**
- **What and why:** Article 50 has applied since 2 Aug 2026. Under Art. 50(4), AI video that looks like real people, places or events, and would pass as real, must be clearly disclosed no later than the first time someone sees it. Our clips are made to look real. A clip forwarded without context becomes exactly the misinformation we are fighting. A reveal after the guess comes too late. Meta's Messaging Policy separately forbids content that deceives or misleads people.
- **Nuance:** There is no official guidance for quiz games. A clear "this could be AI" label next to every clip is the reading we can defend. The Digital Omnibus delay to 2 Dec 2026 only covers providers' watermarking. It does not delay our duties as deployers.
- **Who / time:** Code and video editing, 15 min. Details are in "Label AI clips" under Do today.

**3. The bot must say it is AI and offer a way to reach a person**
- **What and why:** Three rules apply:
  - Meta's Messaging Policy requires automated chats to offer a clear, direct way to reach a human: a person, email, phone or web form.
  - The AI Act (Art. 50(1)) requires telling people from the first interaction that they are talking to AI, unless that is obvious.
  - Anthropic's Usage Policy (current version effective 15 Sep 2025; the version effective 12 Nov 2026 keeps this rule) requires consumer chatbots to disclose AI at least at the start of each session.

  Older adults may think a person is typing.
- **What to do:** One welcome text plus an "AI explanation:" prefix covers all three rules (see Do today). Who / time: code, 5-10 min.

**4. The bot may only message people who wrote first or opted in**
- **What and why:** The Business Messaging Policy (last updated 23 Sep 2026) allows contact only with people who gave their number or username and opted in. Every opt-out must be honored, whether it comes in WhatsApp or elsewhere. A business also may not pass one customer's chat data to another customer. Notifications, streaks, rewards and "challenge friends" are all messages the business starts. So "type your friend's number and the bot invites them" is not allowed, because the friend never opted in.
- **What to do:** Today, only message teammates who agreed. Add a judge's number only if they ask and agree. Sharing goes person to person, through a wa.me link sent from the player's own WhatsApp (see Nice for the demo). The real opt-in flow is listed under After the hackathon.
- **Who / time:** Process only, 0 min today.

**5. The free test number is a closed demo, not a public service**
- **What and why:** Test numbers have relaxed limits and need no payment method. But only allowlisted phones get replies, and the number shows Meta's test identity instead of an approved brand name. Judges and repo visitors cannot try the WhatsApp flow on their own phones.
- **What to do:**
  - Don't put "message +1 555…" on slides or in the README.
  - Record the video on an allowlisted phone.
  - On stage, show the web app through a QR code. It works on any phone.
  - In the README, write "To try the WhatsApp flow, set up your own Meta test number (see whatsapp-bot/SETUP.md)" and add the web link.
  - Call it a prototype.
- **Who / time:** Pitch owner, 5 min.

**6. WhatsApp no longer always gives you the player's phone number**
- **What and why:** Since early April 2026, webhooks include a business-scoped user ID (BSUID), for example `DE.1349…`. It is in `contacts[].user_id` and `messages[].from_user_id`. If a user has a WhatsApp username, the phone number may be missing. It is still sent if the user talked to this business number in the last 30 days, or if they are in the business's contact book. Meta says businesses must support BSUIDs. This breaks the planned "Auth / Phone login" idea, and storing phone numbers also adds GDPR obligations.
- **What to do:** Don't build a phone-number login form. Today's allowlisted phones will still send a number, so the demo is safe. If there is time, add fallback parsing and a magic-link login (see Nice for the demo).
- **Who / time:** Code. Today it's only a decision.

## Do today (before 15:00)

This is about 60-90 min of work in total, split between the coder, whoever writes the texts, and whoever holds the demo phones. Everything here works on the test number.

**The player writes first, and the bot answers anything**
- **What and why:** Meta removed the welcome-message feature (changelog, 27 Mar 2026), so opening the chat does nothing. Partner guides that still describe it are out of date. Also, Meta's service-message docs say a template, including hello_world, does not open the 24h window. Only a message or call from the player does. So the demo script starts with the player typing "Hi" or "PLAY". Older users type all sorts of things, so every first message needs a fast, friendly reply.
- **How:**
  - In Flask, only act on payloads that contain `value.messages`.
  - Log and ignore `value.statuses`. Otherwise status callbacks will send the welcome again.
  - If the sender is new, or sends anything that isn't a game answer (free text, voice note, sticker, photo), reply with one fixed line and the Play now button.
  - Never reply "unknown command". Never pass free text to Claude (red flag 1).
  - Optional: greet the player by `contacts[0].profile.name`.
- **Who / time:** Code, 10-15 min.

**A "Play now" button instead of a raw link (CTA URL message)**
- **What and why:** To someone over 60, a bare `*.trycloudflare.com` link looks like phishing, which is exactly what the game teaches them to avoid. A CTA URL message hides the URL behind one big button.
- **How:**
  - Send `POST /<PHONE_NUMBER_ID>/messages` with `type: "interactive"`, `interactive.type: "cta_url"`, `action.name: "cta_url"` and `parameters: {display_text: "Play now", url: <game URL>}`.
  - Limits: button text 20 characters, body 1,024, footer 60. The header is optional: text up to 60 characters, or an image, video or document.
  - It only goes out as a reply, inside the 24h window.
  - For a header image, upload it once with `POST /<PHONE_NUMBER_ID>/media` and send the `id`. Media sent by link is cached for only 10 min and depends on the tunnel.
  - Keep the URL plain ASCII. WhatsApp flags links with unusual characters as suspicious. We'd also avoid shorteners like bit.ly.
- **Who / time:** Code, 10-15 min.

**A welcome text that covers the AI and human-contact rules**
- **What and why:** One message meets Meta's human-contact rule, the AI Act disclosure duty and Anthropic's Usage Policy (red flag 3). It also suits an AI-literacy product.
- **How:**
  - Example welcome: "Hi! I'm an automated quiz bot. Explanations are written by AI (Claude by Anthropic) and can be wrong. Made for adults. Questions: <team email>. Reply STOP to stop."
  - Start every Claude answer with "AI explanation:".
  - Reply to "help", "human" and "Hilfe" with the team email.
  - Treat "STOP", "Stopp" and "Abmelden" as opt-out: set a flag and send nothing more to that user.
  - In the web app, head the Ask Claude card with "You are chatting with an AI", and say "made for adults" on the landing page. Shared links will reach grandchildren.
- **Who / time:** Code and texts, 10 min.

**Label AI clips where people first see them**
- **What and why:** Required by AI Act Art. 50(4) (red flag 2). It also stops a forwarded clip from spreading as a fake.
- **How:**
  1. Add a WhatsApp caption to every clip: "Quiz clip – could be real or AI-made. Guess below."
  2. Add a web intro line: "Some clips are AI-generated."
  3. After the guess, show a clear reveal: "Made with AI (<tool>)" or "Real video from <source>".
  4. In the demo video and in README GIFs, show an on-screen "AI-generated" label whenever an AI clip appears.
  5. No deepfakes of real, identifiable people, real news events, or real banks and brands. Use real clips only if they are licensed or Creative Commons, with credit. Don't remove generator watermarks or C2PA metadata.

  If there is time, add a small "Real or AI? quiz" badge to every clip with ffmpeg `drawtext` (+20-30 min).
- **Who / time:** Code and video editing, 15 min.

**Return 200 right away and drop duplicate webhooks**
- **What and why:** Meta retries any webhook that doesn't get a 200, for up to 7 days, and warns that retries can create duplicate notifications. A slow Claude call through the tunnel can then send the welcome or the explanation twice, on camera.
- **How:** Return 200 immediately. Run the Claude call and the send in a background thread. Keep an in-memory set of processed `messages[0].id` values and skip any repeats.
- **Who / time:** Code, 10 min.

**Read receipt and "typing…" while Claude thinks**
- **What and why:** A Claude answer takes a few seconds. With no feedback, older users tap again or type "?". Blue ticks plus "typing…" show that something is happening and reduce repeat taps.
- **How:**
  - On every incoming text or button tap, send `POST /<PHONE_NUMBER_ID>/messages` with `{"messaging_product":"whatsapp","status":"read","message_id":"<incoming wamid>","typing_indicator":{"type":"text"}}`.
  - The indicator stays until you reply or 25 s pass. Only show it if you will reply.
  - If Claude may take longer than 25 s, send "One moment…" first.
  - Meta doesn't say whether this works on test numbers. Check it once.
- **Who / time:** Code, 5-10 min.

**Pace messages to the same phone (per-user rate limit)**
- **What and why:** A number may send about 1 message every 6 s to the same user. Short bursts of up to 45 are allowed, but they use up future quota, and past that you get error 131056. A full 5-clip game is about 15-20 messages. Back-to-back rehearsals on one phone can hit the limit right when you record. Meta also doesn't guarantee delivery order, so an explanation and the next clip can arrive in the wrong order.
- **How:** Pause 1-2 s between the explanation and the next clip. On 131056, wait before retrying (Meta suggests 4^X seconds). Give the demo phone a few minutes' rest before the final take, or alternate between two allowlisted phones.
- **Who / time:** Code and the demo crew, 5 min.

**Keep the tunnel URL fixed until recording is done**
- **What and why:** A Cloudflare Quick Tunnel gets a new URL every time it restarts (Cloudflare docs, updated 30 Sep 2026). That breaks the links in every message already sent. Quick Tunnels also have no uptime guarantee, allow only 200 requests at once, and don't support server-sent events (SSE), a common way to stream answers.
- **How:**
  - Don't restart cloudflared between the last check and the end of recording.
  - Keep the tunnel URL in one config variable.
  - Return Claude's answers as plain JSON, not as a stream over SSE.
  - Don't turn on the new `--allowed-mail` flag (Cloudflare changelog, 2 Oct 2026). It requires a browser login, which locks out Meta's webhook and the link-preview crawler.
  - If you switch to ngrok's free plan: its warning page blocks people opening the page in a browser, but webhooks still get through. For `fetch` calls from another site, send the `ngrok-skip-browser-warning` header and allow it in CORS.
- **Who / time:** Whoever runs the server, 5 min.

**Prepare each demo phone**
- **What and why:** The test number shows a test name or a bare number in the chat header. Meta's display order is: saved contact name, then verified business name, then username, then phone number. So saving the bot as a contact is the fastest fix. Also, WhatsApp's Strict account settings (January 2026) block media from people who aren't in your contacts, so clips may not show up.
- **How:** On every allowlisted phone:
  1. Save the test number as a contact named "Real or AI?" and use the logo as its photo.
  2. Go to Settings > Privacy > Advanced. Turn off "Strict account settings" and "Disable link previews".
  3. Open the game once from the Play button. Check that it opens in Safari or Chrome and that the first clip plays inside the page. The web app needs `<video muted playsinline autoplay>` and a big "sound on" button.
  4. On iPhones, turn off Low Power Mode. An Apple forum thread reports it blocks autoplay.

  Don't try to change the test number's display name through the API.
- **Who / time:** People holding the phones, about 5 min per phone.

**Public repo and video: clean-up and a short policy section**
- **What and why:** The repo and video go public today, and judges will read them. A short section showing we follow WhatsApp's AI and opt-in rules and the AI Act labeling rules adds credibility. A leaked token or phone number does the opposite.
- **How:**
  - Add a README section called "Privacy, safety & WhatsApp policy" that says:
    1. The demo runs on Meta's free test number. Only pre-registered team phones get messages. It is not a public service.
    2. How data flows: we store it in memory only. Meta and Anthropic are processors. Meta keeps messages up to 30 days. Anthropic deletes API data within 30 days by default. No model training.
    3. The bot is a quiz in which Claude explains clips. Open questions happen in the web app.
    4. AI clips are labeled when first shown. We list the real clips' sources and licenses and the AI tools used.
    5. The bot never messages anyone who hasn't written to it or opted in. STOP is honored.
    6. How to contact us and how to ask for deletion.
    7. It is for adults.
  - Clean-up: put `.env` in `.gitignore`. Keep tokens, the app secret, phone numbers and WABA or phone-number IDs out of code, logs and screenshots. Mask numbers in logs, for example `+49******123`.
  - In the video, blur phone numbers and dashboard IDs.
- **Who / time:** Code and texts, 15-20 min for the README plus 5 min to check the video.

## Nice for the demo, if there is time

**Share / "challenge your family" button (wa.me link)**
- **What and why:** This covers "share with family" and "challenge friends" with no API and no approval. The player sends the message from their own WhatsApp, so there is no opt-in problem. The friend lands on the web app, which works on any phone; the bot only answers allowlisted phones. A wa.me message counts as new, so it doesn't get the "Forwarded many times" label that looks suspicious.
- **How:**
  - On the final screen, add a plain link `<a href="https://wa.me/?text=...">` with `encodeURIComponent("I got 4/5 on Real or AI? Can you beat me? " + GAME_URL)`. WhatsApp lets the user pick a contact with the text already filled in, and the user taps Send.
  - Optional second button, "Other ways", calling `navigator.share({title, text, url})`. It only works over HTTPS and from a click handler. Ignore `AbortError`, and disable the button until the share finishes.
  - Never put a login token, phone number or name in the shared URL. Use a referral code if you need one.
- **Who / time:** Code, 10-20 min.

**Link preview card (Open Graph tags)**
- **What and why:** A picture card looks trustworthy where a bare tunnel URL does not. It matters most for the shared wa.me link and for links sent as plain text. Meta calls previews "best effort", so always keep clear text or a button next to the link.
- **How:**
  - Put the tags in the `index.html` the server sends, not added later by JavaScript. They go inside `<head>`, within the first 300 KB: non-empty `og:title`, `og:description`, `og:url` (the canonical address, no tokens) and `og:image`.
  - Image: absolute https URL, under 600 KB, at least 300 px wide, no wider than 4:1. A 1200×630 JPEG of about 250 KB is safe.
  - If the bot sends the link as text, set `text.preview_url: true` and put the URL first.
  - To test, paste the link into a chat without sending it. A card should appear within about 10 s. WhatsApp's crawler shows up in the server logs as `WhatsApp/2.x`.
  - After changing the image, change the URL (for example `?v=2`) to avoid stale cached cards. This is third-party advice.
- **Who / time:** Code, 10-15 min.

**Pre-upload the 5 clips and re-encode them for older Androids**
- **What and why:** Sending clips by link through a quick tunnel during recording is fragile. Uploaded media IDs take the tunnel out of the picture, and Meta recommends IDs over links. Android WhatsApp cannot play H.264 "High profile" video with B-frames, and many of our users have older phones.
- **How:**
  - Re-encode each clip: `ffmpeg -i in.mp4 -c:v libx264 -profile:v baseline -pix_fmt yuv420p -vf "scale=720:-2" -b:v 1.2M -c:a aac -b:a 96k -ac 1 -movflags +faststart out.mp4`. Use `scale=-2:720` for landscape clips. The bitrates are our own choice, not Meta's.
  - Upload each clip once with `POST /<PHONE_NUMBER_ID>/media` (multipart: `messaging_product=whatsapp`, `type=video/mp4`, `file=@out.mp4`). Store the returned IDs and send clips with `video: {id}`.
  - IDs last 30 days and belong to that phone number. Upload again when you move to a real number.
- **Who / time:** Code, 15-25 min.

**One message per clip: reply buttons with a video header**
- **What and why:** "Watch, then tap" in a single message is the simplest pattern for older users. It also halves the number of messages per clip, which helps with the per-user rate limit.
- **How:** Send `POST /<PHONE_NUMBER_ID>/messages` with `interactive.type: "button"`, `header: {type: "video", video: {id: <MEDIA_ID>}}`, a body, a footer such as "Clip 2 of 5", and three reply buttons. Store the game state in the button `id` (up to 256 characters). Read `button_reply.id`, not the button title. The tap webhook also includes `context.id`, which identifies the clip message that was answered.
- **Who / time:** Code, 20-30 min if the clip and buttons are sent as separate messages today.

**Instant feedback: a reaction and a quoted reply**
- **What and why:** A check-mark or cross reaction on the player's tap gives instant feedback while Claude thinks. Quoting the clip message above the explanation avoids "which clip was that?" confusion.
- **How:** Send `type: "reaction"` with `reaction: {message_id: <incoming wamid>, emoji: <check or cross>}`. Send Claude's text with `context: {message_id: <clip message wamid>}`, taking the ID from the tap webhook's `context.id`. Reactions only ever report "sent", so don't use them to keep messages in order. Reaction errors (131009) arrive by webhook, not in the API response.
- **Who / time:** Code, 10-15 min.

**Send the next clip only after the explanation arrives**
- **What and why:** This fixes out-of-order messages better than a fixed pause.
- **How:** Tag each message you send with `biz_opaque_callback_data`, up to 512 characters (for example `s123:clip2:explain`). Status webhooks return this tag. Send the next clip when a `delivered` or `read` status arrives for that tag; "read" can come without "delivered". On `failed`, log `errors[0].code` and send the game link instead.
- **Who / time:** Code, 15-20 min.

**"Scan to start": a wa.me link with PLAY, plus a QR code**
- **What and why:** "Point your camera at the square" is easier than any link for older users. It also makes the player write first, which opens the 24h window. Only allowlisted phones get a reply, so use this for the video, not for judges.
- **How:**
  - Make the link `https://wa.me/<test number digits, no +>?text=PLAY` and turn it into a QR code with any generator. The bot answers "PLAY" with the Play now button.
  - Meta has its own QR API (`POST /<PHONE_NUMBER_ID>/message_qrdls`), but its docs don't say whether it works on test numbers. Try it once, and fall back to the generator QR if it fails.
  - Pre-filled text hides ice breakers (next item), so pick one way in.
  - Keep the QR off public slides, or caption it "test phones only".
- **Who / time:** Code, 10 min.

**Ice breakers and slash commands**
- **What and why:** Ice breakers are up to 4 tappable starter prompts (80 characters each, no emoji). They appear the first time someone opens the chat, so no typing is needed. Commands are up to 30 shortcuts shown when you type "/", such as /play and /help. They give the presenter a quick reset. Taps arrive as normal text messages.
- **How:**
  - Send `POST /<PHONE_NUMBER_ID>/conversational_automation` with `{prompts: [...], commands: [{command_name, command_description}]}`. Check the result with `GET /<PHONE_NUMBER_ID>?fields=conversational_automation`. In the UI: App Dashboard > WhatsApp > Configuration > Phone Numbers > Manage Phone Numbers > gear icon > Automations.
  - The bot must match the exact prompt text.
  - To show them on camera, delete the chat on the demo phone, then open it from the saved contact or from `wa.me/<number>` without `?text=`. They don't appear if the chat opens with pre-filled text. Partner docs say they also don't appear on WhatsApp Web.
  - Meta doesn't say whether this works on test numbers. Give it 15 min at most.
- **Who / time:** Code, 10 min plus 5 min to test.

**Business profile and a contact card for the bot**
- **What and why:** A wary older user checks the chat header and profile first. A logo and a plain "About" line look trustworthy on camera. A contact card lets people save the bot under a friendly name in one tap.
- **How:**
  - Profile: send `POST /<PHONE_NUMBER_ID>/whatsapp_business_profile` with `about` (up to 139 characters), `description` (up to 512), `websites` (up to 2) and `vertical: "EDU"`.
  - Profile photo: upload it with Meta's resumable upload (`POST /<APP_ID>/uploads`, then `POST /upload:<id>`), then set `profile_picture_handle`. In the UI: WhatsApp Manager > Account tools > Phone numbers > the number > Profile.
  - Contact card: send a message with `type: "contacts"`, `name.formatted_name: "Real or AI?"`, the number with its `wa_id` (this shows "Message" and "Save contact" buttons) and the game URL.
  - Meta doesn't say whether test numbers accept profile edits. Try once, then skip.
- **Who / time:** Code, 10-15 min.

**End-of-game menu as a list message**
- **What and why:** Useful when the end of the game has more than 3 choices: Play again, Ask Claude (in the web app), Tip, Share, Help. Each row has a 72-character description, which is clearer than short button labels. Keep reply buttons for the main Real/AI choice.
- **How:** Send `interactive.type: "list"` with up to 10 rows. Button text up to 20 characters, row titles up to 24, text-only header. Taps arrive as `list_reply`.
- **Who / time:** Code, 15 min.

**Log in through the bot: a signed magic link instead of a phone login**
- **What and why:** Every incoming message already tells us who the sender is. The bot can put a short-lived, one-time token into the Play link. The web app then knows the player without a phone form, a one-time code or any Meta approval. It works on the test number.
- **How:**
  - When a message comes in, create a token with `HMAC-SHA256(secret, wa_id or user_id + expiry + nonce)`, or use a JWT that expires in about 10 min and can be used once. Send it as `?t=<token>` in the Play button.
  - The backend checks the signature, the expiry and that the token wasn't used before, then sets a session cookie.
  - Use up the token with a JavaScript POST after the page loads, not on the first page load (GET). Link-preview crawlers may open the URL first.
  - Older users forward messages to family. Keep the token one-time, short-lived and tied to the first device that opens it.
  - Never put the raw phone number in the URL. Keep the secret in an environment variable, because the repo is public.
  - Alternative: a "Continue with WhatsApp" button in the web app opens `wa.me/<bot number>?text=LOGIN-<nonce>`, and the webhook links that nonce to the sender.
- **Who / time:** Code, 30-45 min, plus 20 min for the wa.me alternative.

**Handle missing phone numbers and mask numbers in logs**
- **What and why:** Cheap insurance against red flag 6.
- **How:** Store game state under the BSUID (`messages[0].from_user_id` or `contacts[0].user_id`), and also keep `from` / `wa_id` when it's present. Mask phone numbers in logs. The App Dashboard webhook test tool (WhatsApp > Configuration) can simulate a user who has a username and no phone number.
- **Who / time:** Code, 10 min.

**Privacy page and App Dashboard fields (Live mode as a fallback)**
- **What and why:** Meta Platform Terms (3 Feb 2026) require a public privacy policy URL in the App Dashboard and a clear way for users to request deletion. The Messaging Policy also asks for a published privacy policy. Meta's webhook troubleshooting notes that some webhooks are not sent while the app is in Development mode.
- **How:**
  - Write a static `/privacy` page covering:
    - what Meta receives (number, BSUID, username, taps)
    - what goes to Anthropic (answers, questions)
    - what we keep and for how long
    - that nothing is used for training
    - a contact
    - how to get your data deleted (send DELETE to the bot, or email us)
  - In App Dashboard > App settings > Basic, fill in the Privacy Policy URL, the User data deletion URL (`/privacy#delete`), the icon and the category.
  - Make the bot's "DELETE" command wipe that user's in-memory data and confirm.
  - Switch the app to Live mode only if incoming webhooks stop arriving, and test that before 15:00, not on stage. We could not confirm what Live mode requires today; the only list we found is from a 2019 blog post.
- **Who / time:** Code and texts, 20-30 min. The Live switch takes 2 min.

**A stable home for the web app: GitHub Pages**
- **What and why:** The link and preview card stop depending on the tunnel. A `github.io` address also looks more trustworthy than `trycloudflare.com`, whose subdomains appear in phishing lists (third-party data). The public repo already exists.
- **How:**
  - Put the static front end, `og.jpg` and the clips on Pages (repo Settings > Pages, with "Enforce HTTPS" on). Don't store the clips in Git LFS.
  - The Flask server with the Anthropic key stays behind the tunnel. Allow `https://<user>.github.io` in CORS and keep the backend URL in one constant.
  - Limits: 1 GB site size and 10 builds per hour.
  - If you use Vercel instead, only share the production domain. Other deployment URLs are behind Vercel's login by default.
  - If you can't finish before 15:00, stay on the tunnel and don't restart it.
- **Who / time:** Code, 20-30 min.

**A "notification" shot for the video**
- **What and why:** A real reminder sent outside the 24h window needs an approved template and an opt-in. Under Meta's rules, "your daily quiz is ready" and streak pings count as marketing.
- **How:**
  - For the video, send the "reminder" by hand as a normal message to a phone that has just chatted with the bot, so the window is still open.
  - If you want a real template anyway: WhatsApp Manager > Message templates > Create template, category Marketing, or `POST /<WABA_ID>/message_templates`.
  - Review can take up to 24 h. You can edit a template only once a day and 10 times per 30 days. Each language is a separate template.
  - Some users are in a Meta test group that doesn't receive marketing templates outside the window (error 130472). Test the exact template on the exact demo phone before relying on it.
- **Who / time:** 5 min by hand. A template takes 10 min to submit, and review time is unknown.

## After the hackathon (real launch)

**Your own phone number and registration**
- **What and why:** This is the only way past the test allowlist, so that any older user can message the bot. A new number gets a new PHONE_NUMBER_ID. It shares the business account's messaging limit, which starts at 250 users per 24h for a new account. Templates need a payment method. Don't switch before 15:00.
- **How:**
  - Use a number you own. It must receive SMS or voice calls and must not be active on WhatsApp or the WhatsApp Business app; delete that account first. Don't use a teammate's personal number.
  - Add it in App Dashboard > WhatsApp > API Setup, or in WhatsApp Manager.
  - Then call `POST /<PHONE_NUMBER_ID>/request_code?code_method=SMS`, then `POST /<PHONE_NUMBER_ID>/verify_code`, then `POST /<PHONE_NUMBER_ID>/register` with a 6-digit PIN. Registration is API-only, with at most 10 calls per 72 h.
  - Poll `GET /<PHONE_NUMBER_ID>?fields=status,name_status` until the status is CONNECTED.
  - Keep the PIN out of the repo. A June 2026 Meta page (seen only in search results) says the PIN is being phased out for eligible numbers. `/register` still lists it as required.
- **Choose where data is stored before the first registration:** To keep stored message data in Germany, turn on Local Storage while the number is not yet registered. Use `POST /<PHONE_NUMBER_ID>/settings` with `{"storage_configuration":{"status":"IN_COUNTRY_STORAGE_ENABLED","data_localization_region":"DE"}}` (API v21+), or pass `data_localization_region: "DE"` to `/register`. Changing it later means unregistering and registering again. Data being processed can leave Germany for up to 60 min, and Meta stores contact-book numbers outside this setting anyway.
- **Who / time:** Code plus a human in Meta's UI, 30-60 min if the number is ready.
  - A new business account can register only 2 numbers (20 after verification).
  - Numbers can only be deleted in WhatsApp Manager, and not within 30 days of a paid message.
  - After registration, Meta's QR API (`message_qrdls`) creates scan-to-chat codes: up to 2,000 per number, no expiry, no scan statistics.

**Business verification**
- **What and why:** This verifies the legal company behind the Meta business account. It is the fastest way from 250 to 2,000 business-started users per day. It also raises the caps to 20 numbers and 6,000 templates, starts the display-name review, and is required for the blue tick. A hackathon team usually has no legal entity, so first decide who owns the account: a founder's company, a nonprofit, or a host organization.
- **How:**
  - Go to Meta Business Suite > Security Center > Start verification. You need full control of the business account, and an app must already be connected to it.
  - Enter the legal name, address, phone and website exactly as they appear in the company register. If nothing matches, upload a document such as a Handelsregisterauszug or Gewerbeanmeldung.
  - Track progress with `GET /<WABA_ID>?fields=business_verification_status`.
- **Who / time:** Human in Meta's UI, 30-45 min to submit. Review takes from minutes (through a Meta partner) to about 14 business days. That figure comes from an older Help Center page and may be out of date.

**Display name, profile and business username**
- **What and why:** A game about not trusting unknown senders shouldn't launch from a bare number. The display name appears in the chat header only after Meta approves it. Review starts once the business reaches a higher messaging limit, which in practice means after verification. A username gives people a handle they can search for.
- **How:**
  - Set the name in WhatsApp Manager > Account tools > Phone numbers > the number > Profile > Edit, or with `POST /<PHONE_NUMBER_ID>?new_display_name=...`. Track it with `new_name_status`.
  - You get at most 10 changes per 30 days. After approval, register the number again within 14 days.
  - The decision arrives in the `phone_number_name_update` webhook: APPROVED, or REJECTED with a reason.
  - Usernames can be claimed since 29 Jun 2026. Rules: 3-35 characters, only a-z, 0-9, "." and "_", at least one letter. Call `GET /<PHONE_NUMBER_ID>/username_suggestions`, then `POST /<PHONE_NUMBER_ID>/username`.
  - A username only goes live when WhatsApp launches usernames in that country. Meta gives no date for Germany.
- **Note:** Meta's display-name guideline page didn't load for us, so the naming rules are not confirmed in Meta's docs. That includes the "X by Y" pattern and whether "?" is allowed. Check them before submitting "Real or AI?".
- **Who / time:** Human in Meta's UI, 10-20 min. Meta publishes no review time.

**Blue tick (Official Business Account)**
- **What and why:** The strongest "this is genuine" signal for scam-wary older users. It is also required for the Groups API. You need all of the following:
  - you follow Meta's policies
  - 30+ days on the platform
  - a verified business account
  - two-step verification on the number
  - an approved display name

  It is never granted to test accounts.
- **How:** Go to WhatsApp Manager > Overview > the number > Profile > Official business account > Submit request. Check the status with `GET /<PHONE_NUMBER_ID>?fields=official_business_account`. After a rejection, wait 30 days before applying again.
- **Who / time:** Human in Meta's UI, 5-10 min. Possible about 30 days after launch at the earliest. Meta publishes no review time.

**Payment method and 2026 pricing**
- **What and why:** Since 1 Oct 2026, Meta charges per message for bot replies ("service messages") and for utility templates sent inside the 24h window. Both used to be free. Each number gets 1,000 free service messages per month. After that, each costs the country's utility rate. Third-party copies of Meta's German rate card show about $0.055 per service or utility message and about $0.137 per marketing message. One 5-clip game is about 10-15 messages, so the free allowance covers about 70-100 games per number per month. That's another reason to keep the game itself in the web app.
- **Caution:** Meta's own pages disagree. Some still say service messages are free. They also disagree on whether, without a payment method, delivery stops on 1 Oct or only after the free allowance runs out. Assume the stricter version, and check WhatsApp Manager > Insights and the official rate card before launch.
- **How:**
  - Go to Meta Business Suite > Billing & payments (Billing Hub). Add a card or credit line and attach it to the WhatsApp account. A card on an ads account does not carry over.
  - Choose EUR from the start. Changing currency later means cloning the WhatsApp account.
  - Nonprofits: since 12 Oct 2026, Meta marks exempt service messages as `paid_exempt` in status webhooks, but applications to qualify aren't open yet.
  - Watch `pricing.type` in status webhooks. It changes from `free_customer_service` to `regular` once the free messages are used up.
- **Who / time:** Human in Meta's UI, 15 min.

**Messaging limits, quality rating and health webhooks**
- **What and why:** Since 7 Oct 2025, limits apply to the whole business account. They step up from 250 to 2,000, 10,000, 100,000 and unlimited unique users per rolling 24h, counting messages sent outside the window (in practice, templates). Chats the user starts, through wa.me or QR, don't count, so design the flow so that seniors write first. Quality is based on the last 7 days of blocks, reports and mutes. Low quality stops the limit from growing and can pause templates. Policy violations escalate from 1-3-day template blocks up to account lock and permanent shutdown.
- **How:**
  - Check the limit in WhatsApp Manager > Account tools > Messaging limits, or with `GET /<ID>?fields=whatsapp_business_manager_messaging_limit`.
  - In App Dashboard > WhatsApp > Configuration > Webhook fields, subscribe to `account_update`, `business_capability_update`, `phone_number_quality_update`, `phone_number_name_update`, `message_template_status_update`, `template_category_update` and `message_template_quality_update`.
  - Template and account events carry no phone_number_id. Route them on `changes[].field` and always return 200.
  - Appeals go through Business Support Home > Request Review.
- **Who / time:** Code plus a human in Meta's UI, 30 min to set up, then ongoing.

**Opt-in and STOP for reminders and streaks**
- **What and why:** Required before the bot starts any conversation (red flag 4). The opt-in must clearly say what the person is signing up for and name the business. It can be collected on the website. Meta recommends a separate opt-in for each type of message. Seniors who don't remember opting in will block the bot, which hurts the quality rating.
- **How:**
  - Add an unticked checkbox on the final web card: "Send me one Real or AI? quiz a week on WhatsApp. Reply STOP anytime."
  - Store the timestamp and the exact wording for each user (wa_id or BSUID).
  - Confirm with a normal message if the window is open. Otherwise use a utility template such as `optin_confirm`.
  - Every template includes "Reply STOP" or a "Stop reminders" quick-reply button.
  - Germany: the Unfair Competition Act (UWG §7) requires express prior consent for electronic advertising, and double opt-in is common practice. This is general legal knowledge that we haven't checked; ask a lawyer.
- **Who / time:** Code, 1-2 h.

**Reminder and streak templates**
- **What and why:** Outside the 24h window, only approved templates can be sent. Streak reminders, "quiz ready" messages and challenge invites are Marketing, even if users asked for them. Opt-in confirmations can be Utility. Since April 2025, Meta automatically moves promotional "utility" templates to Marketing and tells you through the `template_category_update` webhook. Repeated misuse leads to 7-30-day restrictions on utility templates. A template's URL button can contain only one variable, at the end of the URL, so the domain is fixed once the template is approved. You need a stable domain first.
- **How:**
  - Create templates in WhatsApp Manager, or with `POST /<WABA_ID>/message_templates` and `"category": "MARKETING"`. URL button: `https://<stable-domain>/play/{{1}}`, with an example value.
  - Scheduler logic: if the player wrote in the last 24 h, send a normal message; otherwise send the template.
  - Handle these errors:
    - 131050: the user stopped marketing messages. Mark them as opted out and never retry.
    - 132015 / 132016: template paused or disabled for low quality.
    - 132001: the template doesn't exist in that language.
    - 131049: per-user marketing cap. It doesn't apply to EEA or UK recipients.
  - Marketing templates are not delivered to US (+1) numbers.
  - Meta plans to require a maximum price per marketing message in some markets from Q2 2027.
- **Who / time:** Code, 45-60 min for a real scheduler.

**Live mode without App Review**
- **What and why:** Using the API for our own number makes us a "Direct Developer" in Meta's terms. Meta says no App Review or Advanced access is needed. In production the app should be in Live mode, because some webhooks are not sent in Development mode.
- **How:** Finish the privacy page from "Nice for the demo", then publish the app. Older apps have a Live toggle; newer ones have "Publish" in the left menu. The system-user token keeps working.
- **Who / time:** Human in Meta's UI, 10 min.

**GDPR: data flow and paperwork**
- **What and why:** Berlin reviewers will ask where grandma's data goes. The answer: WhatsApp, then Meta (a processor; messages kept up to 30 days, and stored in Germany if Local Storage is on), then our Flask server, then Anthropic (in the US; API data deleted within 30 days and not used for training by default).
- **How:**
  - Accept Anthropic's Commercial Terms and Data Processing Addendum (DPA). Document the legal basis for sending data to the US (standard contractual clauses).
  - In the privacy policy, list Meta and Anthropic as processors. Mention the BSUID and username, and that Meta stores contact-book numbers regardless of Local Storage.
  - Note Anthropic's exceptions: flagged content is kept up to 2 years and safety-classifier scores up to 7 years. Feedback is kept up to 5 years and may be used for training, so never send feedback from WhatsApp chats.
  - Set our own log retention, for example 7 days.
- **Who / time:** Code plus whoever handles paperwork, about 1 h plus the paperwork.

**Full support for users without a phone number (sending to a BSUID)**
- **What and why:** Users with usernames may arrive without a phone number (red flag 6). Meta says every business connected directly to the API must handle this.
- **How:**
  - Reply by putting the BSUID in the `recipient` field and leaving out `to`. If both are set, `to` wins. Supported since July 2026.
  - Authentication templates still need a phone number.
  - A REQUEST_CONTACT_INFO button (July 2026) lets users share their number in one tap.
  - Subscribe to `user_id_update`; check the exact field name in App Dashboard > WhatsApp > Configuration.
  - BSUIDs belong to our business account and change if the user changes their number.
- **Who / time:** Code, 15-30 min.

**"Is this message a scam?" check, built to collect as little data as possible**
- **What and why:** This is probably the feature older users would value most. It is also the riskiest for personal data: pasted scam messages contain other people's details, bank data and one-time codes. Meta's policy forbids asking for full card, account or ID numbers. A narrow task like this is unlikely to count as a general-purpose AI under §4.7, but Meta decides.
- **How:**
  - Build it in the web app first. Show a warning: "Remove names, phone numbers and bank details. Never paste codes or passwords."
  - Remove IBAN, card and phone-number patterns in the browser before calling Claude. Don't log what users paste.
  - Use a narrow prompt: name the scam signs, and end with "call your bank using the number on your card".
  - If it later moves to WhatsApp: the incoming-message webhook marks forwarded messages (`context.forwarded` / `context.frequently_forwarded`). Seniors can simply forward a suspicious message instead of copy-pasting it, and Claude gets a ready-made "chain message" signal. Keep the same narrow scope and the fixed fallback reply.
- **Who / time:** Code, 1-2 h.

**Minors and an age check**
- **What and why:** Shared links will reach grandchildren. Anthropic's Usage Policy counts under-18s as minors. Products that let minors use the API must follow Anthropic's guidelines for minors (updated 16 Mar 2026). Meta also requires age checks where the law demands them.
- **How:** Today, "made for adults" is in the texts (see Do today). Later, add a simple age check before the Ask Claude card.
- **Who / time:** Code, 15 min.

**Voice-note explanations (optional)**
- **What and why:** For users with poor eyesight or who struggle with reading, a spoken explanation may work better than text.
- **How:** Turn Claude's explanation into speech (text-to-speech) and send it as `type: "audio"` with `audio.voice: true`. Use OGG/Opus mono audio, up to 512 KB, so it shows as a voice note. A `played` status webhook has existed since March 2026.
- **Who / time:** Code, 1-2 h.

## Not possible / not worth it

**Turning on a welcome message**
- **Why not:** Meta removed the feature on 27 Mar 2026. Partner guides that still describe it are out of date.
- **Instead:** Answer the player's first message, whatever it is (see Do today).

**Family groups run by the bot (Groups API)**
- **Why not:** It requires the blue tick, which test numbers never get. Groups hold at most 8 people and are invite-link only. Interactive messages, such as reply buttons, don't work in groups.
- **Instead:** The player pastes the wa.me share link into their own family group. Keep groups on the roadmap for after the blue tick.

**The bot inviting a friend by phone number**
- **Why not:** The friend never opted in (red flag 4). A business also may not pass one customer's information to another.
- **Instead:** A wa.me share from the player's own WhatsApp.

**A custom name or blue tick on the test number**
- **Why not:** A display name needs your own registered number. The blue tick is never granted to test accounts.
- **Instead:** Save the bot as a contact on each demo phone.

**"Ask Claude anything" as a chat inside WhatsApp**
- **Why not:** It would make the bot look like a general-purpose AI assistant, which §4.7 bans (red flag 1).
- **Instead:** Keep the Ask Claude card in the web app.

**Real one-time-code login with authentication templates**
- **Why not:**
  - The message text is fixed by Meta. Copying the code means switching apps and pasting, the hardest flow for older users.
  - One-tap and zero-tap options need a native Android app.
  - It needs a phone number, not a BSUID, and every code costs money in production.
  - Partners report that creating these templates requires a verified business (not confirmed in Meta's docs).
- **Instead:** The magic link. To test anyway, go to WhatsApp Manager > Create template > Authentication > Copy code. If you get a "does not have permission" error, drop it.

**A phone-number login form**
- **Why not:** The phone number is no longer guaranteed (red flag 6), and storing it adds GDPR obligations.
- **Instead:** The magic link from the bot.

**All 5 clips in one swipeable carousel**
- **Why not:** WhatsApp has an interactive carousel (2-10 cards), but sending all clips at once breaks the guess-then-explanation loop that does the teaching. The format of the tap webhook isn't documented, and swiping sideways inside a chat message is hard for older users to discover.
- **Instead:** One message per clip.

**WhatsApp Channels from the bot (not confirmed in Meta's docs)**
- **Why not:** Meta's docs index has no Channels API. Third-party services link a phone as a WhatsApp Web device to post to channels. Meta doesn't allow that, it risks a ban, and it would undermine a digital-safety project.
- **Instead:** If you want a channel, a person creates it in the WhatsApp app (Updates > Channels) and posts clips by hand.

**Switching to a real number, or changing registration or Local Storage, before 15:00**
- **Why not:** You get new IDs, a 250-user limit and a payment-method requirement, and you risk breaking the bot that already works.
- **Instead:** Only consider it if judges must play on their own phones. Otherwise use the web app QR.

**Real scheduled streak reminders today**
- **Why not:** They need an approved Marketing template plus an opt-in flow. Neither can be done properly on the test number by 15:00.
- **Instead:** The hand-sent "notification" shot (see Nice for the demo), and put reminders on the roadmap.

## Sources

### Meta: WhatsApp Cloud API docs
- [Changelog](https://developers.facebook.com/documentation/business-messaging/whatsapp/changelog). The copy we could fetch skips from Dec 2025 to May 2026, so check the live page.
- [Business-scoped user IDs and usernames](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/)
- [Interactive CTA URL messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-cta-url-messages)
- [Interactive reply buttons](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-reply-buttons-messages)
- [Interactive list messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-list-messages)
- [Interactive media carousel](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-media-carousel-messages)
- [Reaction messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/reaction-messages)
- [Contextual replies](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/contextual-replies)
- [Contacts messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/contacts-messages)
- [Text messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/text-messages)
- [Send messages (media caching, delivery order)](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages)
- [Video messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/video-messages)
- [Mark messages as read](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/mark-message-as-read)
- [Typing indicators](https://developers.facebook.com/documentation/business-messaging/whatsapp/typing-indicators)
- [Media upload](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/media)
- [Conversational components (ice breakers, commands)](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/conversational-components)
- [Link previews](https://developers.facebook.com/documentation/business-messaging/whatsapp/link-previews/)
- [QR codes](https://developers.facebook.com/documentation/business-messaging/whatsapp/qr-codes)
- [Business profiles](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-profiles)
- [Business profiles reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/business-profiles)
- [Resumable upload](https://developers.facebook.com/docs/graph-api/guides/upload)
- [Display names](https://developers.facebook.com/documentation/business-messaging/whatsapp/display-names)
- [phone_number_name_update webhook](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/phone_number_name_update)
- [Official business accounts](https://developers.facebook.com/documentation/business-messaging/whatsapp/official-business-accounts)
- [Groups API](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups)
- [Webhooks overview (retries, Dev mode)](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview/)
- [Status webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status)
- [Phone number registration](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/registration)
- [Phone numbers](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/phone-numbers)
- [Two-step verification](https://developers.facebook.com/documentation/business-messaging/whatsapp/business-phone-numbers/two-step-verification/)
- [Local storage](https://developers.facebook.com/documentation/business-messaging/whatsapp/local-storage)
- [Data privacy and security](https://developers.facebook.com/documentation/business-messaging/whatsapp/data-privacy-and-security)
- [About the platform (test numbers, per-user rate limit)](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform)
- [Messaging limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits)
- [Upcoming messaging limit changes](https://developers.facebook.com/documentation/business-messaging/whatsapp/upcoming-messaging-limits-changes)
- [Policy enforcement](https://developers.facebook.com/documentation/business-messaging/whatsapp/policy-enforcement)
- [Template quality](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-quality)
- [Getting opt-in](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in)
- [Templates overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)
- [Template categorization](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization)
- [Per-user marketing limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits/)
- [Media card carousel templates (URL button rules)](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/media-card-carousel-templates/)
- [Authentication templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/authentication-templates/authentication-templates/)
- [Pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing). The fetchable copy is older than the live page.
- [Non-template message pricing (1 Oct 2026 change)](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages)
- [AI Providers pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers)
- [Change billing currency](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/change-billing-currency)
- [Marketing messages pricing (max price)](https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/pricing/)
- [Error codes](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes)
- [App Review (Direct Developers)](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/app-review)
- [Account model evolution](https://developers.facebook.com/documentation/business-messaging/whatsapp/account-model-evolution)
- [Docs index (llms.txt)](https://developers.facebook.com/documentation/business-messaging/whatsapp/llms.txt)
- [App modes](https://developers.facebook.com/docs/development/build-and-test/app-modes)

### Meta: terms, policy and Help Center
- [Meta Terms for WhatsApp Business Platform (§1.4, §4.7; last modified 23 Sep 2026)](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform)
- [WhatsApp Business Messaging Policy (last updated 23 Sep 2026)](https://whatsappbusiness.com/policy/)
- [Meta Platform Terms (last updated 3 Feb 2026)](https://developers.facebook.com/terms/dfc_platform_terms/)
- [Business verification](https://www.facebook.com/business/help/2058515294227817)
- [WhatsApp Business credit line](https://www.facebook.com/business/help/1684730811624773)

### WhatsApp Help Center and blog
- [How to use click to chat (wa.me)](https://faq.whatsapp.com/5913398998672934/)
- [Privacy settings](https://faq.whatsapp.com/3307102709559968/)
- [Suspicious links (1)](https://faq.whatsapp.com/393169153028916/)
- [Suspicious links (2)](https://faq.whatsapp.com/1201685718230080/)
- [Strict account settings (WhatsApp blog)](https://blog.whatsapp.com/whatsapps-latest-privacy-protection-strict-account-settings)
- [Strict account settings (Meta Newsroom, Jan 2026)](https://about.fb.com/news/2026/01/whatsapp-strict-account-settings-safeguarding-against-cyber-attacks/)
- [Forwarding limits (Meta, Apr 2020)](https://about.fb.com/news/2020/04/whatsapp-message-forward-limit/)

### EU
- [AI Act Art. 50 transparency FAQ (updated 24 Jul 2026)](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act)
- [AI Act Article 50, consolidated text](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50)
- [Code of Practice on AI-generated content](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)
- [European Commission interim measures on WhatsApp, 9 Jun 2026 (IP/26/1276)](https://ec.europa.eu/commission/presscorner/api/files/document/print/en/ip_26_1276/IP_26_1276_EN.pdf)

### Anthropic
- [Usage Policy (effective 12 Nov 2026)](https://www.anthropic.com/legal/aup)
- [Usage Policy in force until 12 Nov 2026](https://www.anthropic.com/legal/archive/22742366-2ef0-4c7a-a833-6523f10d3944)
- [Guidelines for organizations serving minors (updated 16 Mar 2026)](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors)
- [How long API data is stored](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)
- [Is my data used for model training](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training)

### Web platform, tunnels and hosting
- [MDN: Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)
- [caniuse: Web Share](https://caniuse.com/web-share)
- [WebKit: video policies for iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/)
- [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay)
- [MDN: autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [Cloudflare Quick Tunnels (updated 30 Sep 2026)](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)
- [Cloudflare: protected Quick Tunnels (2 Oct 2026)](https://developers.cloudflare.com/changelog/post/2026-10-02-protected-quick-tunnels/)
- [ngrok free plan limits](https://ngrok.com/docs/pricing-limits/free-plan-limits)
- [ngrok browser warning (ERR_NGROK_6024)](https://ngrok.com/docs/errors/err_ngrok_6024)
- [GitHub Pages: HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [GitHub Pages: limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Vercel deployment protection](https://vercel.com/docs/deployment-protection)

### Third-party sources (not official, used only as leads)
- [TechCrunch on the WhatsApp chatbot ban (Oct 2025)](https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform)
- [Slaughter and May on Meta's appeal](https://www.slaughterandmay.com/recent-work/meta-on-its-appeal-against-the-european-commission-s-whatsapp-interim-measures-decision/)
- [Clickatell on conversational components](https://guides.clickatell.com/whatsapp-channel/channel-capabilities/conversational-components)
- [previewog: WhatsApp link preview troubleshooting](https://previewog.com/fix-whatsapp-link-preview-not-working/)
- [Germany rate card copy (landinchat)](https://landinchat.com/whatsapp-pricing/germany)
- [WhatsApp API pricing overview (EngageLab)](https://www.engagelab.com/blog/whatsapp-business-api-pricing)
- [Apple developer forum: Low Power Mode and autoplay](https://developer.apple.com/forums/thread/727459)
- [Whapi.Cloud on Channels gateways](https://whapi.cloud/blog/whatsapp-channel-api-automation). Listed only as an example of what we advise against.