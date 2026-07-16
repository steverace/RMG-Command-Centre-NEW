# Obsidian Integration Setup

RMCC stays the source of truth for live work. Obsidian is the local second-brain layer for notes, decisions, research, and project context.

Fresh local vault path:

```text
C:\Users\race_\Desktop\Agent Folder\Race Media Second Brain
```

Run this SQL in Supabase before using the Knowledge panels live:

```sql
create table if not exists public.knowledge_refs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('project', 'client', 'task', 'idea', 'quote', 'goal')),
  entity_id uuid not null,
  vault_path text not null,
  title text not null,
  summary text,
  tags text[] not null default '{}',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (entity_type, entity_id, vault_path)
);

create index if not exists knowledge_refs_entity_idx
  on public.knowledge_refs (entity_type, entity_id)
  where deleted_at is null;

create index if not exists knowledge_refs_path_idx
  on public.knowledge_refs (vault_path)
  where deleted_at is null;

create table if not exists public.agent_events (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'rmcc',
  action text not null,
  entity_type text check (entity_type is null or entity_type in ('project', 'client', 'task', 'idea', 'quote', 'goal')),
  entity_id uuid,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_events_entity_idx
  on public.agent_events (entity_type, entity_id, created_at desc);

alter table public.knowledge_refs enable row level security;
alter table public.agent_events enable row level security;

revoke all on table public.knowledge_refs from anon;
revoke all on table public.agent_events from anon;

grant select, insert, update on table public.knowledge_refs to authenticated;
grant select, insert on table public.agent_events to authenticated;
grant all on table public.knowledge_refs to service_role;
grant all on table public.agent_events to service_role;

drop policy if exists "Authenticated users can manage knowledge refs"
  on public.knowledge_refs;
create policy "Authenticated users can manage knowledge refs"
  on public.knowledge_refs
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can read agent events"
  on public.agent_events;
create policy "Authenticated users can read agent events"
  on public.agent_events
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can create agent events"
  on public.agent_events;
create policy "Authenticated users can create agent events"
  on public.agent_events
  for insert
  to authenticated
  with check (true);
```

The hosted `/mcp` endpoint can create and read `knowledge_refs`, but it never touches the local vault directly. The local bridge creates the actual Markdown files.

## Local bridge

The local bridge lives at:

```text
tools/obsidian-bridge.mjs
```

It uses:

- `RMCC_VAULT_PATH`
- `RMCC_OBSIDIAN_VAULT`
- `RMCC_MCP_URL`
- `RMCC_MCP_TOKEN`

Copy `tools/obsidian-bridge.env.example` to a local-only env file or set those values in your shell. Do not commit the token.

Useful commands:

```powershell
node tools\obsidian-bridge.mjs ensure-vault
node tools\obsidian-bridge.mjs create-note --entity-type project --entity-id <uuid> --title "Project Name" --summary "Useful context"
node tools\obsidian-bridge.mjs get-context --entity-type project --entity-id <uuid>
node tools\obsidian-bridge.mjs search-vault --query "client name"
```

`create-note` writes the Markdown file locally. If `RMCC_MCP_TOKEN` is set, it also calls `link_vault_note` so RMCC knows where the note lives.
