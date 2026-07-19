# RMCC Voice Agent

Standalone LiveKit voice/chat assistant prototype for Race Media Command Centre.

This is not the RMCC dashboard. It is a separate agent project that reads and updates RMCC through the protected `/mcp` action boundary when configured, with local mock JSON data retained only as an offline fallback.

## Structure

```text
agent/        LiveKit Agents backend
web/          simple test interface
mock-data/    fake projects, tasks, money, and ideas
docs/         setup and future integration notes
```

## Run The Web Test Interface

Open:

```text
web/index.html
```

For the most reliable microphone permission behaviour, serve the `web/` folder from `localhost` rather than opening the file directly. Browsers are much better at remembering microphone permission for a local origin than for a raw file.

For the LiveKit-enabled local test page, run this from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-web.ps1
```

Then open:

```text
http://127.0.0.1:8790
```

For a static-only fallback, you can still serve the `web/` folder directly. For example:

```bash
cd web
python -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

The web interface includes:

- Text chat that works independently with local mock responses.
- API-backed RMCC overview for focus, projects, stale work, overdue tasks, and money. It uses the real protected MCP bridge when `RMCC_MCP_URL` and `RMCC_MCP_TOKEN` are available.
- Push-to-talk recording with explicit start/stop. The microphone grant is reused until you press "Release microphone".
- Optional spoken replies through browser speech synthesis.
- Always-on footer assistant scaffold, disabled by default.
- Connection status.
- LiveKit token endpoint and browser room connection when served through `run-web.ps1`.
- Visible debug log for microphone permission, recording, transcription, agent response, TTS, and errors.

## Run The LiveKit Agent Backend

From the project root:

```bash
cd agent
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy ..\.env.example ..\.env
python main.py dev
```

Use `python main.py console` for local terminal testing, or `python main.py start` for a production-style run.

You will need LiveKit credentials in `.env`:

```text
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

Depending on the STT/LLM/TTS providers you choose, you may also need provider keys such as `OPENAI_API_KEY`, `DEEPGRAM_API_KEY`, and `CARTESIA_API_KEY`.

## RMCC Tools

The LiveKit agent exposes these mock tool functions:

- `get_today_focus`
- `get_active_projects`
- `get_stale_projects`
- `get_overdue_tasks`
- `get_outstanding_money`
- `add_idea`
- `add_task`
- `add_project_note`
- `summarise_project`

The underlying mock action module uses the required names:

- `getTodayFocus`
- `getActiveProjects`
- `getStaleProjects`
- `getOverdueTasks`
- `getOutstandingMoney`
- `addIdea`
- `addTask`
- `addProjectNote`
- `summariseProject`

The agent keeps the existing function names, but uses the protected RMCC MCP tools when configured. Real task and project writes are previewed first and require explicit confirmation in the voice session. Money fields and deletion are not exposed.

When the MCP bridge is not configured, the interface falls back to `mock-data/` and clearly reports that it is not operating on live RMCC records.

The local web server also exposes read-only mock API endpoints:

- `/api/rmcc/summary`
- `/api/rmcc/focus`
- `/api/rmcc/projects`
- `/api/rmcc/stale`
- `/api/rmcc/tasks`
- `/api/rmcc/money`
- `/api/rmcc/ideas`

## Voice Personality

See `butler-personality.md`.

The assistant is a warm, dry, practical British butler-style assistant. It must not imitate Michael Caine or clone any real actor voice.

## Current Limitations

- The web page is now a local LiveKit test client, but it is still a prototype rather than production RMCC UI.
- Push-to-talk records reliably, but browser transcription still depends on Web Speech API availability.
- The LiveKit backend needs `run-agent-dev.ps1` running before the browser can talk to the real agent.
- ElevenLabs is prepared through environment variables only; it is not wired as the active TTS provider yet.
- No direct Supabase, payment, invoice, delete, or money-editing actions are exposed to the voice agent.

## Safety Boundary

Current integration flow is:

```text
RMCC Dashboard / Voice Agent
-> Token-protected RMCC MCP actions
-> Supabase server-side function
-> LLM / STT / TTS providers
```

The agent must not connect directly to Supabase and must never expose service-role keys in the frontend.
