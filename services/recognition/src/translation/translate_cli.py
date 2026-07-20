import argparse
import json
import sys

from translation.coherence import make_coherent_text


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True, help="Raw sign text to normalize")
    args = parser.parse_args()

    result = make_coherent_text(args.text)
    output = {
        "success": result.get("success", False),
        "text": result.get("coherent_text", ""),
        "provider": result.get("provider", "local"),
        "changes_applied": result.get("changes_applied", []),
    }
    if result.get("error"):
        output["error"] = result["error"]

    print(json.dumps(output))
    if not output["text"] and not args.text.strip():
        raise SystemExit(0)
    raise SystemExit(0)


if __name__ == "__main__":
    main()
