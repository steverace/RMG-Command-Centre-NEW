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
```

If row level security is enabled in this Supabase project, add policies matching the other private Command Centre tables so the signed-in dashboard user can select, insert, update, and soft-delete rows.

The app stores:

- original payment amount and billing cycle
- monthly equivalent for review cards
- next payment date
- supplier and payment method
- business/personal flag
- last paid date when rolling a recurring payment forward
