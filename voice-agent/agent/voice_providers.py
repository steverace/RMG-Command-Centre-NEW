from __future__ import annotations

import os
from typing import Any

from livekit.agents import inference


def build_session_config() -> dict[str, Any]:
    """Build LiveKit AgentSession provider config from environment variables."""
    config: dict[str, Any] = {
        "vad": inference.VAD(),
        "stt": inference.STT(
            os.getenv("RMCC_STT_MODEL", "deepgram/nova-3"),
            language=os.getenv("RMCC_STT_LANGUAGE", "en-GB"),
        ),
        "llm": inference.LLM(os.getenv("RMCC_LLM_MODEL", "openai/gpt-4.1-mini")),
    }

    if os.getenv("RMCC_ENABLE_TTS", "true").lower() == "true":
        config["tts"] = inference.TTS(
            os.getenv("RMCC_TTS_MODEL", "cartesia/sonic-3"),
            voice=os.getenv("RMCC_TTS_VOICE", "3c0f09d6-e0d7-499c-a594-70c5b7b93048"),
        )

    return config


def elevenlabs_configured() -> bool:
    """Future server-side ElevenLabs support flag. Never expose these values to the browser."""
    return bool(os.getenv("ELEVENLABS_API_KEY") and os.getenv("ELEVENLABS_VOICE_ID"))
