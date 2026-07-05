-- Responde — shared Supabase schema
-- ---------------------------------
-- Responde signs users in against the SAME Supabase project used by PyDent
-- (and future LHDM clinic products). auth.users is shared, so the same
-- email + password works everywhere. These tables let Responde match a
-- signed-in user to their workspace and load the omnichannel inbox.

-- Workspaces come from the product the customer bought (PyDent, health
-- clinic software, ...). source_app records which one.
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_app text not null default 'pydent',
  created_at timestamptz not null default now()
);

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
