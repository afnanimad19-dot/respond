# supabase/ — backend for Responde (shared with PyDent AI)

## schema.sql

The single source of truth. It is **idempotent** — safe to paste into the
Supabase SQL editor repeatedly; it upgrades older databases in place
(`add column if not exists`, `drop policy if exists` + recreate). Keep it
that way: every new change must be re-runnable.

Key rules:
- One row per LHDM product in `products`; workspaces carry `product_slug`.
  NEVER create per-product tables.
- Row-level security everywhere. Workspace isolation via `is_member()`;
  manager-only writes via `member_role()`; notifications are strictly
  per-user (`user_id = auth.uid()`).
- `messages.kind = 'comment'` rows are internal team notes — they must
  never be forwarded to a customer channel.
- `channels.access_token` should move to Supabase Vault before production.

## functions/ (Deno Edge Functions)

- `invite` — email invitation; caller must be owner/manager; uses
  `auth.admin.inviteUserByEmail` + upserts `workspace_members`.
- `whatsapp-webhook` — Meta calls this. GET = verification handshake,
  POST = inbound messages/statuses. Captures Click-to-WhatsApp ad
  `referral` into contacts' ad fields.
- `whatsapp-send` — outbound via Graph API; refuses `kind='comment'`.
- `whatsapp-templates` — create template at Meta / sync approval statuses.
- `telegram-webhook`, `telegram-send` — Telegram Bot API equivalents.

Deploy: `supabase functions deploy <name>`. Secrets (set with
`supabase secrets set`):
- `SB_URL`, `SB_SERVICE_ROLE_KEY` (auto-provided as SUPABASE_* too)
- `WHATSAPP_VERIFY_TOKEN` — any random string, same value in Meta app
- `TELEGRAM_BOT_TOKEN` (optional, per-bot)

Meta webhook URL: `https://<ref>.functions.supabase.co/whatsapp-webhook`.
Never log tokens or message bodies in production functions.
