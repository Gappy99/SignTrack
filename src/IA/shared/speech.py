import os
import subprocess


def speak_text(text: str) -> bool:
    """Reproduce texto por voz en Windows usando System.Speech."""
    if not text or not text.strip():
        return False

    if os.name != "nt":
        return False

    safe_text = text.replace("'", "''")
    command = (
        "Add-Type -AssemblyName System.Speech; "
        "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$synth.Rate = 0; "
        "$synth.Volume = 100; "
        f"$synth.Speak('{safe_text}')"
    )

    try:
        subprocess.Popen(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                command,
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True
    except Exception:
        return False