from __future__ import annotations

import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class RmccApiError(RuntimeError):
    """Raised when the protected RMCC action boundary cannot be used."""


def _env(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


def configured() -> bool:
    return bool(_env("RMCC_MCP_URL", "RMCC_API_BASE_URL") and _env("RMCC_MCP_TOKEN", "RMCC_API_TOKEN"))


def endpoint() -> str:
    value = _env("RMCC_MCP_URL", "RMCC_API_BASE_URL")
    if not value:
        raise RmccApiError("RMCC MCP URL is not configured")
    return value


def call_tool(name: str, arguments: dict[str, Any] | None = None) -> Any:
    token = _env("RMCC_MCP_TOKEN", "RMCC_API_TOKEN")
    if not token:
        raise RmccApiError("RMCC MCP token is not configured")

    payload = json.dumps(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments or {}},
        }
    ).encode("utf-8")
    request = Request(
        endpoint(),
        data=payload,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "RMCC-Voice-Agent/1.0",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=float(os.getenv("RMCC_API_TIMEOUT", "20"))) as response:
            raw = response.read(2_000_000)
    except HTTPError as error:
        raise RmccApiError(f"RMCC MCP returned HTTP {error.code}") from error
    except URLError as error:
        raise RmccApiError(f"RMCC MCP connection failed: {error.reason}") from error
    except TimeoutError as error:
        raise RmccApiError("RMCC MCP request timed out") from error

    try:
        body = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as error:
        raise RmccApiError("RMCC MCP returned invalid JSON") from error

    if body.get("error"):
        message = body["error"].get("message", "RMCC MCP tool call failed")
        raise RmccApiError(str(message))

    content = body.get("result", {}).get("content", [])
    if not content or not isinstance(content[0], dict):
        raise RmccApiError("RMCC MCP returned no tool content")

    text = content[0].get("text", "")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text
