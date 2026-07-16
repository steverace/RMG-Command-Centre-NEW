# Outgoing Payments Setup

The Money page includes an outgoing payments section for subscriptions, hosting, domains, bills, software, AI tools, finance costs, and other regular payments.

Run this SQL in Supabase SQL Editor before using the section live:

```sql
create table if not exists outgoing_payments (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text not null default 'subscription',
  supplier text,
  amount numeric not null default 0,
  billing_cycle text not null default 'monthly',
  next_due_date date,
  active boolean not null default true,
  payment_method text,
  is_business boolean not null default true,
  last_paid_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists outgoing_payments_due_idx
  on outgoing_payments (next_due_date)
  where deleted_at is null;

create index if not exists outgoing_payments_active_idx
  on outgoing_payments (active)
  where deleted_at is null;

alter table public.outgoing_payments enable row level security;

revoke all on table public.outgoing_payments from anon;
grant select, insert, update on table public.outgoing_payments to authenticated;
grant all on table public.outgoing_payments to service_role;

drop policy if exists "Authenticated users can read outgoing payments"
  on public.outgoing_payments;
create policy "Authenticated users can read outgoing payments"
  on public.outgoing_payments
  for select
  to authenticated
  using (deleted_at is null);

drop policy if exists "Authenticated users can create outgoing payments"
  on public.outgoing_payments;
create policy "Authenticated users can create outgoing payments"
  on public.outgoing_payments
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update outgoing payments"
  on public.outgoing_payments;
create policy "Authenticated users can update outgoing payments"
  on public.outgoing_payments
  for update
  to authenticated
  using (true)
  with check (true);
```

If Supabase also reports that `pg_net` is installed in the `public` schema, run this once in the SQL Editor to move it into Supabase's normal extension schema:

```sql
create schema if not exists extensions;

do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_net'
      and n.nspname = 'public'
  ) then
    execute 'alter extension pg_net set schema extensions';
  end if;
end $$;
```

This app is a signed-in private dashboard, so the outgoing payment policies deliberately allow authenticated dashboard users to read active rows and create/update rows, including soft deletes via `deleted_at`.

The app stores:

- original payment amount and billing cycle
- monthly equivalent for review cards
- next payment date
- supplier and payment method
- business/personal flag
- last paid date when rolling a recurring payment forward
