# RMCC Voice Agent Next Steps

## Done Locally

- Created `agent/.venv/` for the backend Python environment.
- Installed the LiveKit agent dependencies.
- Created `.env` with the LiveKit project URL filled in.
- Added `.gitignore` so `.env` and local environment files are treated as private.
- Fixed broken pound-symbol formatting in the mock money responses.
- Confirmed the backend code imports successfully.
- Confirmed the LiveKit worker registers with the LiveKit Cloud project.
- Added `run-agent-console.ps1` and `run-agent-dev.ps1` helper scripts.
- Added `run-web.ps1` and a local token server for browser LiveKit tokens.
- Added a browser LiveKit connect/disconnect flow and real push-to-talk gating.
- Replaced mock agent reads with the protected RMCC MCP bridge when configured.
- Added real project/task reads, real outstanding-money reads, and confirmation-gated task/project updates.
- Added a local server proxy so the browser never receives the RMCC bearer token.

## Steve Needs To Get

Add these values into `.env`:

```text
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
OPENAI_API_KEY=
DEEPGRAM_API_KEY=
CARTESIA_API_KEY=
```

Minimum first test:

- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `OPENAI_API_KEY`

These are now filled in locally.

For full voice with the current settings:

- `DEEPGRAM_API_KEY` for speech-to-text
- `CARTESIA_API_KEY` for text-to-speech

## LiveKit

1. Open LiveKit Cloud.
2. Open the Race Media Command Centre project.
3. Go to the project settings/API keys area.
4. Copy the API key and secret into `.env`.

Do not put these values in the web folder or share them publicly.

## After Keys Are Added

Run the console test:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-agent-console.ps1
```

Then ask:

```text
What should I focus on today?
```

The browser LiveKit connection is implemented. The agent now uses protected, read-only RMCC API calls when configured, and requires explicit confirmation before task/project writes.

To run the LiveKit backend for browser sessions later:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-agent-dev.ps1
```

To run the browser/token server:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-web.ps1
```

Then open:

```text
http://127.0.0.1:8790
```

Use this order:

1. Start `run-agent-dev.ps1`.
2. Start `run-web.ps1`.
3. Open the browser page.
4. Click `Check setup`.
5. Click `Connect to agent`.
6. Use push-to-talk.
