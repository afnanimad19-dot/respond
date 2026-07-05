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
values ('pydent', 'PyDent', 'Dental clinic management software')
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

-- Kept for the mobile app, which selects `source_app`.
create or replace view workspace_details as
  select w.id, w.name, w.product_slug, p.name as source_app, w.created_at
  from workspaces w
  join products p on p.slug = w.product_slug;

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
  description text,
  position int not null default 0
);

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

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  status text not null default 'open' check (status in ('open','closed','snoozed')),
  assignee_id uuid references auth.users (id) on delete set null,
  last_message_at timestamptz not null default now()
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

-- Row level security: members only see their own workspace.
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

create policy "members read workspace" on workspaces
  for select using (is_member(id));

create policy "members read membership" on workspace_members
  for select using (is_member(workspace_id));

create policy "members manage stages" on lifecycle_stages
  for all using (is_member(workspace_id));

create policy "members manage contacts" on contacts
  for all using (is_member(workspace_id));

create policy "members manage conversations" on conversations
  for all using (is_member(workspace_id));

create policy "members manage messages" on messages
  for all using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id and is_member(c.workspace_id)
    )
  );
