-- Responde — shared Supabase schema
-- ---------------------------------
-- Responde signs users in against the SAME Supabase project used by PyDent
-- (and every future LHDM product). auth.users is shared, so the same
-- email + password works everywhere. These tables let Responde match a
-- signed-in user to their workspace and load the omnichannel inbox.
--
-- HOW MULTI-PRODUCT WORKS
-- -----------------------
-- Do NOT create a separate set of tables per software. There is ONE
-- `products` registry, and every workspace points at the product it came
-- from. Onboarding a brand-new software you build later is a single row:
--
--   insert into products (slug, name) values ('pyhealth', 'PyHealth');
--
-- Every product you build must create its accounts in THIS Supabase
-- project's auth (supabase.auth.signUp from PyDent, PyHealth, ...). Then:
--   * the same email + password works in the product AND in Responde;
--   * when the product creates a clinic/company, it inserts one row in
--     `workspaces` with its own product_slug and one row per staff member
--     in `workspace_members`;
--   * Responde reads workspace_members for the signed-in user and instantly
--     knows which software each workspace came from.

-- Registry of every software we build. One row per product, ever.
create table if not exists products (
  slug text primary key,            -- short id used in code, e.g. 'pydent'
  name text not null,               -- display name, e.g. 'PyDent'
  description text,
  created_at timestamptz not null default now()
);

insert into products (slug, name, description)
values ('pydent', 'PyDent AI', 'Dental clinic management software')
on conflict (slug) do nothing;

-- Example for the future — when the next software ships, this is ALL the
-- schema work it needs:
-- insert into products (slug, name, description)
-- values ('pyhealth', 'PyHealth', 'Health clinic management software');

-- Workspaces come from the product the customer bought. product_slug
-- records which one (the app reads it as source_app).
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_slug text not null default 'pydent' references products (slug),
  created_at timestamptz not null default now()
);

-- Upgrade path: if `workspaces` was created by an older version of this
-- script (which had a free-text source_app column and no product_slug),
-- add the new column and carry the old values over.
alter table workspaces add column if not exists product_slug text not null default 'pydent';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'workspaces' and column_name = 'source_app'
  ) then
    update workspaces set product_slug = lower(source_app) where source_app is not null;
    alter table workspaces drop column source_app;
  end if;
end $$;

-- Any slug already used by a workspace must exist in the registry before
-- the foreign key is (re)attached.
insert into products (slug, name)
select distinct product_slug, initcap(product_slug) from workspaces
on conflict (slug) do nothing;

alter table workspaces drop constraint if exists workspaces_product_slug_fkey;
alter table workspaces
  add constraint workspaces_product_slug_fkey
  foreign key (product_slug) references products (slug);

-- Kept for the mobile app, which selects `source_app`.
create or replace view workspace_details as
  select w.id, w.name, w.product_slug, p.name as source_app, w.created_at
  from workspaces w
  join products p on p.slug = w.product_slug;

-- Display profile for every user (name, avatar color, presence). Created
-- automatically when the account signs up in ANY LHDM product.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  color text not null default '#1F6BFF',
  online boolean not null default false,
  updated_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create table if not exists workspace_members (
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'agent' check (role in ('owner', 'manager', 'doctor', 'agent')),
  invited_email text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Lifecycle stages are editable per workspace from the mobile app.
create table if not exists lifecycle_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  color text not null default '#0A84FF',
  emoji text,
  description text,
  position int not null default 0
);

alter table lifecycle_stages add column if not exists emoji text;

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  phone text,
  handle text,
  channel text not null check (channel in ('whatsapp','instagram','messenger','telegram','tiktok','sms','webchat')),
  lifecycle_stage_id uuid references lifecycle_stages (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

-- Ad attribution: which ad brought this lead in (Meta Click Ads, TikTok...).
alter table contacts add column if not exists ad_platform text;
alter table contacts add column if not exists ad_name text;
alter table contacts add column if not exists ad_campaign text;

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  status text not null default 'open' check (status in ('open','closed','snoozed')),
  assignee_id uuid references auth.users (id) on delete set null,
  unread int not null default 0,
  last_message_at timestamptz not null default now()
);

alter table conversations add column if not exists unread int not null default 0;

-- Connected messaging channels per workspace (WhatsApp Cloud API number,
-- Telegram bot, ...). Tokens are used ONLY by Edge Functions with the
-- service-role key; move access_token into Supabase Vault for production.
create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  type text not null check (type in ('whatsapp','instagram','messenger','telegram')),
  display_name text not null,
  phone_number_id text,      -- WhatsApp Cloud API phone number id
  waba_id text,              -- WhatsApp Business Account id (for templates)
  access_token text,
  created_at timestamptz not null default now()
);

-- kind = 'comment' rows are INTERNAL: only workspace members can read them,
-- and they are never delivered to the contact's channel.
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  kind text not null default 'text' check (kind in ('text','comment','event','audio','file','unsupported')),
  sender_user_id uuid references auth.users (id),
  from_contact boolean not null default false,
  body text not null,
  mentions uuid[] default '{}',
  created_at timestamptz not null default now()
);

-- Saved '/' snippets, shared inside a workspace.
create table if not exists snippets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  shortcut text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- WhatsApp message templates. status starts 'pending' and flips to
-- 'approved' / 'rejected' when Meta reviews the template through the
-- WhatsApp Business API. Only approved templates can be sent.
create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  language text not null default 'en',
  body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- Per-user notifications (mentions, assignments, system events). Each user
-- only ever sees their OWN rows — enforced by RLS below.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'system' check (kind in ('mention','system','assignment')),
  title text not null,
  body text,
  conversation_id uuid references conversations (id) on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row level security: members only see their own workspace.
alter table products enable row level security;
alter table profiles enable row level security;
alter table snippets enable row level security;
alter table message_templates enable row level security;
alter table notifications enable row level security;
alter table channels enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table lifecycle_stages enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

create or replace function is_member(w uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = w and user_id = auth.uid()
  );
$$;

-- Role of the calling user inside a workspace ('owner','manager','doctor',
-- 'agent' or null). Used to give managers more power than agents.
create or replace function member_role(w uuid)
returns text language sql stable security definer as $$
  select role from workspace_members
  where workspace_id = w and user_id = auth.uid()
  limit 1;
$$;

-- drop-then-create makes this script safe to run again at any time
drop policy if exists "signed-in users read products" on products;
create policy "signed-in users read products" on products
  for select using (auth.role() = 'authenticated');

drop policy if exists "members read workspace" on workspaces;
create policy "members read workspace" on workspaces
  for select using (is_member(id));

drop policy if exists "members read membership" on workspace_members;
create policy "members read membership" on workspace_members
  for select using (is_member(workspace_id));

-- Only owners/managers can invite, change roles or remove members.
drop policy if exists "managers manage membership" on workspace_members;
create policy "managers manage membership" on workspace_members
  for all
  using (member_role(workspace_id) in ('owner', 'manager'))
  with check (member_role(workspace_id) in ('owner', 'manager'));

-- Profiles: any signed-in user can read display info; you edit only yours.
drop policy if exists "read profiles" on profiles;
create policy "read profiles" on profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles
  for update using (id = auth.uid());

-- Everyone in the workspace can SEE the lifecycle; only owners/managers
-- can add, rename, reorder or delete stages. (Moving a CONTACT between
-- stages is an update on contacts, which every member can do.)
drop policy if exists "members manage stages" on lifecycle_stages;
drop policy if exists "members read stages" on lifecycle_stages;
create policy "members read stages" on lifecycle_stages
  for select using (is_member(workspace_id));

drop policy if exists "managers write stages" on lifecycle_stages;
create policy "managers write stages" on lifecycle_stages
  for insert with check (member_role(workspace_id) in ('owner', 'manager'));

drop policy if exists "managers update stages" on lifecycle_stages;
create policy "managers update stages" on lifecycle_stages
  for update using (member_role(workspace_id) in ('owner', 'manager'));

drop policy if exists "managers delete stages" on lifecycle_stages;
create policy "managers delete stages" on lifecycle_stages
  for delete using (member_role(workspace_id) in ('owner', 'manager'));

-- Channel credentials: visible/manageable only by owners & managers; Edge
-- Functions use the service-role key and bypass RLS.
drop policy if exists "managers manage channels" on channels;
create policy "managers manage channels" on channels
  for all
  using (member_role(workspace_id) in ('owner', 'manager'))
  with check (member_role(workspace_id) in ('owner', 'manager'));

drop policy if exists "members manage contacts" on contacts;
create policy "members manage contacts" on contacts
  for all using (is_member(workspace_id));

drop policy if exists "members manage conversations" on conversations;
create policy "members manage conversations" on conversations
  for all using (is_member(workspace_id));

drop policy if exists "members manage snippets" on snippets;
create policy "members manage snippets" on snippets
  for all using (is_member(workspace_id));

drop policy if exists "members manage templates" on message_templates;
create policy "members manage templates" on message_templates
  for all using (is_member(workspace_id));

-- Privacy: notifications are PER USER — even teammates in the same
-- workspace cannot read each other's notifications.
drop policy if exists "own notifications only" on notifications;
create policy "own notifications only" on notifications
  for all using (user_id = auth.uid());

drop policy if exists "members manage messages" on messages;
create policy "members manage messages" on messages
  for all using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id and is_member(c.workspace_id)
    )
  );
