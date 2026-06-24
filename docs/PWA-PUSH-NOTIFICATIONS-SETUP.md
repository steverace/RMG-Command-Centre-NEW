# PWA and Push Notifications Setup

The dashboard can now be installed on Android as a Progressive Web App.

## Android install

1. Open the live dashboard in Chrome on Android.
2. Open the Chrome menu.
3. Tap **Install app** or **Add to Home screen**.
4. Open RMCC from the new home screen icon.
5. Go to **Notifications** in the dashboard.

## Required environment variables

Set this in Cloudflare Pages:

- `VITE_WEB_PUSH_PUBLIC_KEY`

The existing server-side variables are also used to store subscriptions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Later, the reminder sender will also need:

- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`

## Supabase table

Create this table before enabling live subscriptions:

```sql
create table if not exists push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Reminder engine next

The current pass installs the app, registers a service worker, and stores device subscriptions.

The next pass should add a scheduled Cloudflare function that checks:

- tasks due today/tomorrow/overdue
- projects due soon/overdue
- stale projects
- unpaid project balances
- Google Calendar events

Then it sends Web Push notifications to active subscriptions.
