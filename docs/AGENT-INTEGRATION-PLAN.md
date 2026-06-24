# Command Centre Agent Integration Plan

## Current foundation

- Dashboard: Vite, React, TypeScript, Tailwind, Supabase.
- Existing data areas: projects, tasks, clients, money, quotes, ideas, weekly review, settings.
- Voice prototype: LiveKit, OpenAI, Deepgram, Cartesia, currently running as a standalone test app.
- New dashboard entry point: `/voice`.
- Quick Add now creates tasks, projects, and ideas from the main shell.

## Integration order

1. Stabilise local development
   - Keep the local folder in sync with GitHub.
   - Keep `.env` local only.
   - Use the dashboard on `http://127.0.0.1:5180/` and the voice prototype on `http://127.0.0.1:8790/`.

2. Connect voice agent to real Command Centre data
   - Read-only first: today summary, active projects, stale projects, overdue tasks, unpaid money, captured ideas.
   - Write actions second: add task, add idea, update next action, mark task complete.
   - Require confirmation before destructive or money-related changes.

3. Add protected backend actions
   - Do not expose Supabase service role keys in the browser.
   - Use Supabase Edge Functions or Cloudflare server-side functions for agent actions.
   - Reuse the logged-in user's Supabase session where possible.

4. Google Calendar
   - Add calendar read access first for upcoming events.
   - Add event creation later for scheduled tasks and reminders.
   - Store calendar connection status in settings.

5. Push notifications
   - Start with browser notifications for desktop testing.
   - Add mobile push through a proper notification provider or PWA push subscription.
   - Trigger reminders from due tasks, stale projects, unpaid invoices, and calendar events.

6. MCP access for AI coworkers
   - Build an MCP server exposing safe Command Centre tools.
   - Start read-only: list projects, list tasks, get focus summary.
   - Add write tools with strict validation: create task, create idea, update status.
   - Keep audit trails for any AI-made change.

## Safety rules

- No service role key in frontend code.
- No deleting records by agent action; use archive/soft delete only.
- Confirm before sending external messages, changing money fields, or marking client work complete.
- Log agent-created changes so the dashboard can show what happened and why.
