# Goals & Habits Supabase setup

Run this SQL in the Supabase SQL editor before using the Goals & Habits page live.

```sql
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  area text not null default 'personal',
  why text,
  target_label text,
  target_value numeric,
  current_value numeric,
  unit text,
  deadline date,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  status text not null default 'not_started',
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text not null default 'health',
  frequency text not null default 'daily',
  days_of_week integer[],
  target_type text not null default 'check',
  target_value numeric,
  unit text,
  time_of_day time,
  goal_id uuid references public.goals(id) on delete set null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null default current_date,
  completed boolean not null default true,
  value numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index if not exists goals_status_idx on public.goals(status) where deleted_at is null;
create index if not exists goals_deadline_idx on public.goals(deadline) where deleted_at is null;
create index if not exists goal_milestones_goal_id_idx on public.goal_milestones(goal_id) where deleted_at is null;
create index if not exists habits_active_idx on public.habits(active) where deleted_at is null;
create index if not exists habits_goal_id_idx on public.habits(goal_id) where deleted_at is null;
create index if not exists habit_logs_habit_date_idx on public.habit_logs(habit_id, log_date desc);

alter table public.goals enable row level security;
alter table public.goal_milestones enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "Authenticated users can manage goals"
  on public.goals for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage goal milestones"
  on public.goal_milestones for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage habits"
  on public.habits for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage habit logs"
  on public.habit_logs for all
  to authenticated
  using (true)
  with check (true);
```

Once the SQL has run, redeploy the app or refresh the live page. The page will stop showing the setup warning after Supabase can read the four tables.
