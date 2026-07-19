# LiveKit Setup Notes

The backend uses the LiveKit Agents Python framework.

Core files:

- `agent/main.py` creates the `AgentServer`, `AgentSession`, `Agent`, and LiveKit function tools.
- `agent/mock_actions.py` reads fake RMCC data from `mock-data/`.
- `agent/voice_providers.py` keeps STT, LLM, and TTS provider configuration modular.

## Required Environment

Copy `.env.example` to `.env` and set:

```text
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

Then choose provider settings:

```text
RMCC_STT_MODEL=deepgram/nova-3
RMCC_STT_LANGUAGE=en-GB
RMCC_LLM_MODEL=openai/gpt-4.1-mini
RMCC_ENABLE_TTS=true
RMCC_TTS_MODEL=cartesia/sonic-3
RMCC_TTS_VOICE=3c0f09d6-e0d7-499c-a594-70c5b7b93048
```

Provider API keys should stay server-side.

## Commands

```bash
cd agent
pip install -r requirements.txt
python main.py console
python main.py dev
python main.py start
```

`console` is useful for local testing. `dev` runs the agent server for LiveKit client sessions. `start` is intended for production-style execution.

## Frontend Connection

The current `web/` folder is a local LiveKit test client. `serve-livekit-web.mjs` serves the client, mock RMCC read endpoints, and a short-lived LiveKit token endpoint on `http://127.0.0.1:8790/`.

To test the current connection:

1. Start `run-agent-dev.ps1` so the LiveKit worker is available.
2. Start `run-web.ps1` so the local client and token endpoint are available.
3. Open `http://127.0.0.1:8790/`, run `Check setup`, then `Connect to agent`.
4. Join a room only when Steve explicitly connects and use push-to-talk for microphone publishing.
5. Keep the debug log events for mic, room, transcription, agent response, and TTS state.

The React dashboard `/voice` page currently links to this test client; it does not yet embed the LiveKit room into the dashboard or replace the mock action functions with protected RMCC API calls.
