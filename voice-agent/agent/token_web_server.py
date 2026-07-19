from __future__ import annotations

import json
import os
from datetime import timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from dotenv import load_dotenv
from livekit import api

ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = ROOT / "web"
DEFAULT_ROOM = "rmcc-voice-agent-local"


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment value: {name}")
    return value


def _make_token(room: str, identity: str, name: str) -> str:
    token = (
        api.AccessToken(_required_env("LIVEKIT_API_KEY"), _required_env("LIVEKIT_API_SECRET"))
        .with_identity(identity)
        .with_name(name)
        .with_ttl(timedelta(minutes=30))
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
    )
    return token.to_jwt()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/livekit-token":
            self._handle_token(parsed.query)
            return
        if parsed.path == "/api/health":
            self._send_json({"ok": True, "livekitUrlSet": bool(os.getenv("LIVEKIT_URL"))})
            return
        super().do_GET()

    def _handle_token(self, query: str) -> None:
        params = parse_qs(query)
        room = (params.get("room", [DEFAULT_ROOM])[0] or DEFAULT_ROOM).strip()
        name = (params.get("name", ["Steve"])[0] or "Steve").strip()
        identity = (params.get("identity", ["steve-local"])[0] or "steve-local").strip()

        try:
            self._send_json(
                {
                    "url": _required_env("LIVEKIT_URL"),
                    "room": room,
                    "identity": identity,
                    "token": _make_token(room, identity, name),
                }
            )
        except Exception as exc:
            self._send_json({"ok": False, "error": str(exc)}, status=500)

    def _send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    load_dotenv(ROOT / ".env")
    port = int(os.getenv("RMCC_WEB_PORT", "8790"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"RMCC Voice Agent web/token server: http://127.0.0.1:{port}")
    print(f"Serving: {WEB_ROOT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
