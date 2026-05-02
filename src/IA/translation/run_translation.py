import argparse
import json
import sys
from pathlib import Path

IA_ROOT = Path(__file__).resolve().parent.parent
if str(IA_ROOT) not in sys.path:
    sys.path.append(str(IA_ROOT))

from translation.coherence import make_coherent_text
from translation.text_normalizer import normalize_text


def run_translation(sign: str, coherent: bool) -> dict:
    raw = (sign or "").strip()

    if coherent:
        coherent_result = make_coherent_text(raw)
        return {
            "success": bool(coherent_result.get("success", False)),
            "text": coherent_result.get("coherent_text", ""),
            "provider": coherent_result.get("provider", "local"),
            "changes_applied": coherent_result.get("changes_applied", []),
            "error": coherent_result.get("error"),
        }

    normalized = normalize_text(raw)
    return {
        "success": True,
        "text": normalized.get("normalized_text", ""),
        "provider": "local",
        "changes_applied": normalized.get("changes_applied", []),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sign", default="", help="Texto reconocido de seña")
    parser.add_argument("--coherent", action="store_true", help="Aplicar coherencia con Gemini y fallback local")
    args = parser.parse_args()

    result = run_translation(args.sign, args.coherent)
    print(json.dumps(result))

    if not result.get("success"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
