# Responde — Road to Full Production

## Where we are today ✅

The **entire mobile app front-end is built and working** (demo mode):
sign-in, omnichannel inbox with drawer + lifecycle filters, chat with
internal notes/@mentions, power composer (AI prompts, voice, attachments,
snippets, variables, WhatsApp templates with approval states), editable
lifecycle, team invites UI with roles, notifications center, ad-attribution
banners, settings, dark mode.

The **database design is done**: `supabase/schema.sql` creates every table
with row-level security — workspace isolation, per-user notifications, the
multi-product registry that links PyDent AI (and future software) to one
shared account system.

What's left is the **backend layer** that replaces demo data with real data.

---

## Milestone 1 — Real login + real data (the foundation)

**Goal:** users sign in with their PyDent credentials and see their real
workspace. Edits (lifecycle, assignment, stages) sync live between devices
and PyDent.

Build list:
- PyDent must create its users in the shared Supabase project
  (`supabase.auth.signUp`) and insert `workspaces` + `workspace_members`
  rows when a clinic signs up. If existing users live elsewhere, one-time
  migration into shared auth.
- Point Responde at the project (`.env`: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`).
- Swap the app's demo store for Supabase queries + **Realtime
  subscriptions** (messages/conversations update live).

Needed from you: the Supabase project URL + anon key, and confirmation that
PyDent's users are (or will be) created in that project.

## Milestone 2 — Team invites by email + enforced roles

**Goal:** Invite by email actually sends an email; the invitee joins the
same workspace with the assigned role; roles actually restrict what people
can do.

Build list:
- Supabase Edge Function `invite`: calls
  `auth.admin.inviteUserByEmail(email)` and inserts a pending
  `workspace_members` row with the chosen role; accepting the email sets
  the password and flips `accepted_at`.
- Role enforcement in RLS: only `owner`/`manager` can invite members, edit
  lifecycle stages, or remove people; `doctor`/`agent` can chat, comment,
  assign, and move stages.
- Email sender: Supabase's built-in SMTP works to start; a custom domain
  (via Resend or similar) looks more professional.

Needed from you: nothing technical — optionally a sending domain
(e.g. mail.lhdm.com).

## Milestone 3 — Real WhatsApp (the big one)

**Goal:** real customer messages flow in and out of the app through the
WhatsApp Business (Cloud) API.

Important fact: a WhatsApp Business **number can only be connected to one
platform at a time**. If your number is currently connected to respond.io,
it must be **migrated** to your own Meta app (Meta supports number
migration; chat history on the old platform does not come along —
export it first if you need it).

Build list (all as Supabase Edge Functions):
- **Webhook receiver** — Meta calls it for every inbound message; it
  creates/updates the contact + conversation and inserts the message.
  Click-to-WhatsApp ads include a `referral` object (ad id, headline,
  source) — that is exactly how the "Came from ad" banner gets real data,
  including your Arabic ads.
- **Sender** — calls the Graph API `/messages` endpoint; webhooks update
  ✓ sent / ✓✓ delivered / read status.
- **Media** — upload/download for voice notes, images and files
  (Supabase Storage ↔ WhatsApp media endpoints).
- **Template sync** — creates templates via the API and receives Meta's
  pending → approved/rejected verdicts (the app already models this).
- **24-hour rule** — outside the 24h customer-service window only approved
  templates can be sent; the composer already knows the difference.
- `channels` table per workspace holding the phone-number id + encrypted
  access token, so every clinic connects its own number(s).

Needed from you:
- Meta Business Manager admin access
- The WhatsApp Business number (and the decision to migrate it off
  respond.io)
- A verified Meta developer app with the WhatsApp product added

Cost note: Meta bills per 24h conversation (marketing conversations cost
more than service ones); Supabase Edge Functions are effectively free at
clinic scale.

## Milestone 4 — Instagram, Messenger, more channels

Same Meta app, additional products (Instagram Messaging API, Messenger
Platform). Each is another webhook + sender pair feeding the same
`messages` table — the inbox UI already renders every channel. Telegram is
the easiest (open Bot API, no approval). TikTok has no public DM API yet.

## Milestone 5 — Native app + push notifications

**Goal:** installable iPhone/Android app with real push ("Kara replied",
"You were mentioned").

Build list:
- Wrap the app with **Capacitor** → native iOS/Android builds with real
  camera, microphone and gallery access (the attach/voice UI already
  exists).
- Push via FCM (Android) + APNs (iOS), triggered from the webhook Edge
  Function on new messages/mentions.

Needed from you: Apple Developer account ($99/yr) and Google Play account
($25 one-time) if you want store distribution; TestFlight/APK sideload
works before that.

## Milestone 6 — AI features on real data

Wire the composer's AI Prompts (tone, translate, grammar, simplify) and
smart replies to a real model via an Edge Function, so drafts are rewritten
properly — including Arabic ↔ English translation for your Gulf clients.

---

## Privacy model (already designed, enforced in Milestone 1)

- Every table carries `workspace_id`; RLS makes cross-workspace reads
  impossible — clinic A can never see clinic B, even with the same app.
- **Notifications are per-user**: teammates in the same clinic cannot read
  each other's notifications (`user_id = auth.uid()`).
- Internal comments (`messages.kind = 'comment'`) are never forwarded to
  the customer's channel — enforced in the sender function, not just UI.
- Channel tokens are stored encrypted and only touched by server-side Edge
  Functions (never shipped to the phone).
- One shared login across PyDent + Responde, but each product only writes
  workspaces tagged with its own `product_slug`.

## Suggested order & rough effort

| # | Milestone                       | Effort (focused work) |
|---|---------------------------------|-----------------------|
| 1 | Real login + live data          | 3–5 days              |
| 2 | Email invites + role enforcement| 1–2 days              |
| 3 | WhatsApp Cloud API              | 1–2 weeks (incl. Meta setup/review) |
| 4 | Instagram / Messenger / Telegram| 2–4 days per channel  |
| 5 | Native wrap + push              | ~1 week (incl. store review) |
| 6 | Real AI prompts                 | 1–2 days              |
