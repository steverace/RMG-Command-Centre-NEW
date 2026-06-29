# MCP AI Access Setup

The dashboard now includes a Cloudflare Pages Function at `/mcp`.

This fixes the previous problem where MCP clients received the React HTML page instead of a backend response.

## Required Cloudflare environment variables

Set these in Cloudflare Pages:

- `RMCC_MCP_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

`RMCC_MCP_TOKEN` is a private bearer token. AI clients must send:

```text
Authorization: Bearer <RMCC_MCP_TOKEN>
```

The older `SUPABASE_SERVICE_ROLE_KEY` name also works for legacy Supabase projects, but new Supabase projects should use a secret key from the Secret keys section.

## Tools

- `get_focus_summary`
- `list_projects`
- `list_tasks`
- `list_ai_ready_tasks`
- `create_task`
- `update_task`
- `mark_task_needs_steve`
- `mark_task_complete_for_review`

The task write tools are intentionally narrow. They can create and update tasks, move a task into Steve input needed, or mark an AI-completed task for Steve review.

## Client endpoint

Use:

```text
https://your-command-centre-domain/mcp
```

The dashboard page `/ai-access` shows the exact endpoint for the live site.
