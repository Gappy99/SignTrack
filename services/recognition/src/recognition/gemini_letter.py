import base64
import json
import os
import re
from pathlib import Path
from urllib import error, request

from shared.env_loader import load_project_env

load_project_env()

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
REQUEST_TIMEOUT_SECONDS = 12
VALID_LETTERS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


def _read_image_base64(image_path: str) -> tuple[str, str]:
    path = Path(image_path)
    suffix = path.suffix.lower()
    mime = "image/jpeg"
    if suffix == ".png":
        mime = "image/png"
    elif suffix == ".webp":
        mime = "image/webp"
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return mime, data


def _request_gemini_vision(model: str, api_key: str, prompt: str, mime: str, image_b64: str) -> str:
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime, "data": image_b64}},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 16,
        },
    }

    body = json.dumps(payload).encode("utf-8")
    url = GEMINI_API_URL.format(model=model, api_key=api_key)
    req = request.Request(
        url=url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"GEMINI_HTTP_{exc.code}: {detail}") from exc
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"GEMINI_REQUEST_FAILED: {exc}") from exc

    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("GEMINI_EMPTY_CANDIDATES")

    parts = (((candidates[0].get("content") or {}).get("parts")) or [])
    text = " ".join((part.get("text") or "").strip() for part in parts).strip()
    if not text:
        raise RuntimeError("GEMINI_EMPTY_TEXT")

    return text.strip().upper()


def _parse_letter(raw: str) -> str | None:
    cleaned = re.sub(r"[^A-Z]", "", (raw or "").upper())
    if len(cleaned) == 1 and cleaned in VALID_LETTERS:
        return cleaned
    match = re.search(r"\b([A-Z])\b", cleaned)
    if match and match.group(1) in VALID_LETTERS:
        return match.group(1)
    if cleaned and cleaned[0] in VALID_LETTERS:
        return cleaned[0]
    return None


def predict_letter_from_image(image_path: str) -> dict:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return {"success": False, "error": "GEMINI_API_KEY_MISSING"}

    preferred_model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
    prompt = (
        "Identifica la letra del alfabeto dactilológico (A-Z) que muestra la mano en esta imagen. "
        "Responde con UNA sola letra mayúscula latina (A-Z). "
        "Si no hay mano visible o no es una letra clara, responde NONE."
    )

    mime, image_b64 = _read_image_base64(image_path)
    models_to_try = []
    for candidate in (preferred_model, "gemini-2.0-flash", "gemini-1.5-flash-latest"):
        if candidate and candidate not in models_to_try:
            models_to_try.append(candidate)

    last_error = None
    for model in models_to_try:
        try:
            raw = _request_gemini_vision(model, api_key, prompt, mime, image_b64)
            if raw == "NONE" or not raw:
                return {"success": False, "error": "GEMINI_NO_LETTER"}
            letter = _parse_letter(raw)
            if not letter:
                return {"success": False, "error": "GEMINI_INVALID_LETTER", "raw": raw}
            return {
                "success": True,
                "label": letter,
                "confidence": 0.72,
                "source": "gemini",
                "model": model,
            }
        except RuntimeError as exc:
            last_error = exc
            if "GEMINI_HTTP_404" in str(exc):
                continue
            return {"success": False, "error": str(exc)}

    return {"success": False, "error": f"GEMINI_ALL_MODELS_FAILED: {last_error}"}
