# Google Calendar Setup

The dashboard has a Calendar page at `/calendar`.

## What it does first

- Connects your browser session to Google Calendar.
- Uses read-only access.
- Shows your next 10 upcoming events.

## Google Cloud steps

1. Open Google Cloud Console.
2. Create or select a project for Race Media Command Centre.
3. Enable the Google Calendar API.
4. Configure the OAuth consent screen.
5. Create credentials:
   - OAuth client ID: Web application.
   - API key: restricted to Google Calendar API.
6. Add your live dashboard URL as an authorised JavaScript origin.
   - Example: `https://your-command-centre.pages.dev`
7. Add these Cloudflare Pages environment variables:
   - `VITE_GOOGLE_CALENDAR_CLIENT_ID`
   - `VITE_GOOGLE_CALENDAR_API_KEY`
8. Redeploy the Cloudflare Pages site.

## Later phases

- Create calendar events from tasks.
- Show diary clashes on the dashboard.
- Trigger reminders from due dates and calendar events.
- Send phone notifications once push notification support is added.
