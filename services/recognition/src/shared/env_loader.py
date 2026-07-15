import os
from pathlib import Path


def load_project_env() -> None:
    current = Path(__file__).resolve()
    repo_root = None
    for parent in current.parents:
        if (parent / "SignTrack.sln").exists() or (parent / "package.json").exists():
            repo_root = parent
            break

    if repo_root is None:
        repo_root = current.parents[4]

    env_path = repo_root / ".env"

    if not env_path.exists():
        return

    try:
        from dotenv import load_dotenv

        load_dotenv(env_path, override=False)
        return
    except Exception:
        pass

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value