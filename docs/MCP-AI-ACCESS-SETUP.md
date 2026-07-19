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
- `create_project`
- `create_idea`
- `update_task`
- `update_project`
- `mark_task_needs_steve`
- `mark_task_complete_for_review`
- `append_project_context`
- `link_vault_note`
- `list_knowledge_refs`
- `get_entity_context`

The task and project write tools are intentionally narrow. They require `confirmed: true` after the human has approved the exact action. They can create and update tasks, update safe project workflow fields, move a task into Steve input needed, or mark an AI-completed task for Steve review. Money fields and deletion are not exposed.

Project and idea write tools use safe defaults. Knowledge tools only create/read RMCC link records; the local Obsidian bridge creates the actual Markdown files in the vault.

Run `docs/OBSIDIAN-INTEGRATION-SETUP.md` before using the knowledge tools live.

## Client endpoint

Use:

```text
https://your-command-centre-domain/mcp
```

The dashboard page `/ai-access` shows the exact endpoint for the live site.
