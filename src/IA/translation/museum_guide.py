import json
import os
from urllib import error, request

from shared.env_loader import load_project_env

load_project_env()

DEFAULT_GUIDE_URL = "http://localhost:3006/kinalSportsAdmin/v1/guide/query"
REQUEST_TIMEOUT_SECONDS = 8


def ask_museum_guide(question: str, current_node_key: str) -> dict:
    api_url = os.getenv("MUSEUM_GUIDE_API_URL", DEFAULT_GUIDE_URL).strip() or DEFAULT_GUIDE_URL
    node_key = (current_node_key or os.getenv("MUSEUM_START_NODE", "lobby")).strip() or "lobby"
    text = (question or "").strip()

    if not text:
        return {
            "success": False,
            "error": "EMPTY_QUESTION",
        }

    payload = {
        "question": text,
        "currentNodeKey": node_key,
    }

    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url=api_url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        return {
            "success": False,
            "error": f"GUIDE_HTTP_{exc.code}: {detail}",
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "success": False,
            "error": f"GUIDE_REQUEST_FAILED: {exc}",
        }

    target = data.get("targetSection") or {}
    return {
        "success": bool(data.get("success", False)),
        "response_text": data.get("responseText", ""),
        "target_name": target.get("nombre"),
        "next_node_key": target.get("nodeKey", node_key),
        "raw": data,
    }