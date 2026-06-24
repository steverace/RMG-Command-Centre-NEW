# MCP AI Access Setup

The dashboard now includes a Cloudflare Pages Function at `/mcp`.

This fixes the previous problem where MCP clients received the React HTML page instead of a backend response.

## Required Cloudflare environment variables

Set these in Cloudflare Pages:

- `RMCC_MCP_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`RMCC_MCP_TOKEN` is a private bearer token. AI clients must send:

```text
Authorization: Bearer <RMCC_MCP_TOKEN>
```

## First tools

- `get_focus_summary`
- `list_projects`
- `list_tasks`

These are read-only starter tools. Write tools should be added only after this connection is proven stable.

## Client endpoint

Use:

```text
https://your-command-centre-domain/mcp
```

The dashboard page `/ai-access` shows the exact endpoint for the live site.
