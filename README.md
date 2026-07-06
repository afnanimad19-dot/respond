# Responde App 📱

A mobile-only omnichannel chat app — our own take on respond.io — that links to
**PyDent** and every other clinic software we build (dental, health, ...).
Customers sign in here with the **same email + password** they already use in
that software, and their workspace, team, contacts and conversations follow them.

## What's inside

- **Sign in** with existing credentials (+ optional workspace name/ID). When a
  Supabase project is configured, the app authenticates against the shared
  `auth.users` and matches the workspace through `workspace_members`. Without
  configuration it runs in **Demo Mode** with a sample PyDent workspace.
- **Omnichannel inbox** — conversations from WhatsApp, Instagram, Messenger,
  Telegram, TikTok and more in one list, with channel badges, unread counts,
  All / Open / Closed / Snoozed filters and lifecycle-stage filters.
- **Chat** — Apple-style bubbles (liquid glass, vivid blue — no purple), channel
  info, close / snooze / reopen, assignment to teammates.
- **Internal comments** 🟠 — tap the note button on the **left of the message
  box** and the composer turns **orange**: whatever you type is visible only to
  your team, never to the patient. Type `@` to tag a teammate (they get a
  notification), then tap the button again to switch back to normal replies.
- **Power composer** — toolbar with: AI Prompts (change tone, fix grammar,
  simplify — demo transforms until the AI backend is connected), voice-note
  recording, attachments (camera / gallery / device / library), `/` snippets,
  `$` variables (`$name`, `$firstName`, `$phone`, `$agent`, `$workspace` —
  resolved on send), and **WhatsApp templates** with Meta approval status
  (only `approved` templates can be sent; new ones are submitted as
  `pending`). Channel selector ("WhatsApp Business ▾") above the input.
- **Ad attribution** — leads that arrive from an ad (e.g. Meta Click Ads,
  Arabic creatives render RTL correctly) show a banner in the chat with the
  platform, campaign and ad name, plus workflow event lines in the timeline.
- **Inbox drawer** — All / Mine / Unassigned counts, lifecycle stages with
  emojis and counts, and per-teammate filters.
- **Notifications** — New / Archived / All filters, Archive All, Recent and
  Older sections; mentions raise notifications automatically.
- **Lifecycle** — editable pipeline stages (New Lead → Contacted → Interested →
  Booked → Lost out of the box). Add, rename, recolor, reorder or delete stages
  and move any contact between them straight from the chat header.
- **Team** — invite teammates by email, give them roles (Owner, Manager,
  Doctor, Agent), see who's online, remove members.
- **Settings** — profile + workspace card, busy toggle, dark mode (follows the
  system), haptics, sign out.

## Run it

```bash
npm install
npm run dev
```

Open the printed URL on your phone (or in a mobile viewport). The app is
mobile-only by design — on a desktop it renders as a centered phone column.

## Connect to Supabase (link with PyDent)

1. Run `supabase/schema.sql` in the shared Supabase project that PyDent uses.
2. Copy `.env.example` to `.env` and fill in:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

3. Restart `npm run dev`. Sign-in now checks the real shared users and
   workspaces; row-level security makes sure members only ever see their own
   workspace, and internal comments (`messages.kind = 'comment'`) are never
   delivered to the contact's channel.

## Going live (backend)

The whole backend is in this repo, ready to deploy:

1. **Database** — run `supabase/schema.sql` in the shared Supabase project
   (idempotent — safe to re-run; it upgrades older databases in place).
2. **App** — set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env`.
   Live mode activates automatically: real login, real workspace data,
   Realtime sync; demo mode remains the fallback without keys.
3. **Edge Functions** — `supabase functions deploy invite whatsapp-webhook
   whatsapp-send whatsapp-templates telegram-webhook telegram-send`, then
   `supabase secrets set WHATSAPP_VERIFY_TOKEN=<random string>`.
4. **WhatsApp** — in the Meta app, point the webhook at
   `https://<ref>.functions.supabase.co/whatsapp-webhook` with that verify
   token, and insert the workspace's number into the `channels` table
   (`type='whatsapp'`, `phone_number_id`, `waba_id`, `access_token`).
   Click-to-WhatsApp ad leads arrive with ad attribution automatically.
5. **Install on phones** — the app is a PWA (Add to Home Screen works
   today); `capacitor.config.ts` is ready for native iOS/Android builds
   when store distribution is wanted (see `ROADMAP.md`).

## Stack

React 18 + TypeScript + Vite, `@supabase/supabase-js`, no UI framework — the
liquid-glass design system lives in `src/styles/global.css`.
