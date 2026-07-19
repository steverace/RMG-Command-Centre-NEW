# Future RMCC Integration

The current project is intentionally standalone. It must not import RMCC dashboard code or connect to Supabase.

## Future Flow

```text
RMCC Dashboard
-> Safe RMCC API actions
-> RMCC Voice Agent
-> LLM / STT / TTS providers
```

## API Action Boundary

Replace `agent/mock_actions.py` internals with HTTP calls to safe RMCC API endpoints later. Keep function names stable so the LiveKit agent does not need a major rewrite.

Initial read actions:

- `getTodayFocus`
- `getActiveProjects`
- `getStaleProjects`
- `getOverdueTasks`
- `getOutstandingMoney`
- `summariseProject`

Initial write actions:

- `addIdea`
- `addTask`
- `addProjectNote`

All write actions should be auditable.

## Explicitly Out Of Scope

- Supabase direct access.
- Service-role keys in the frontend.
- Payment actions.
- Invoice actions.
- Project deletion.
- Editing money fields.
- Always-on listening by default.
