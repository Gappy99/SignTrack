"""
Módulo de Text-to-Speech (TTS): generación de audio a partir de texto.

- Generación de audio a partir de texto: speak_text(texto) reproduce por voz el texto.
- Integración TTS: usa Windows System.Speech (SAPI) vía PowerShell.
- Calidad: velocidad y volumen configurables (Rate=0, Volume=100); en Windows
  la calidad depende de las voces instaladas en el sistema.
- Múltiples voces disponibles: list_voices() devuelve las voces del sistema;
  speak_text(text, voice_index=N) permite elegir una voz por índice.

Limitaciones:
- Solo funciona en Windows (os.name == "nt"). En Linux/macOS devuelve False.
- "Audio HD" (24kHz+, neural) requeriría otro motor (ej. Azure TTS, Google Cloud TTS);
  aquí se usa la calidad estándar del sintetizador de Windows.
"""

import os
import subprocess
import json


def list_voices() -> list[dict]:
    """
    Lista las voces disponibles en el sistema (Windows SAPI).
    Permite cumplir con "múltiples voces disponibles" en la integración TTS.
    En Linux/macOS devuelve lista vacía.
    """
    if os.name != "nt":
        return []

    script = (
        "Add-Type -AssemblyName System.Speech; "
        "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$synth.GetInstalledVoices() | ForEach-Object -Begin { $i = 0 } -Process { "
        "[PSCustomObject]@{ Index = $i; Name = $_.VoiceInfo.Name; Culture = $_.VoiceInfo.Culture.Name }; $i++ } | "
        "ConvertTo-Json -Compress"
    )
    try:
        result = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0 or not result.stdout or result.stdout.strip() == "":
            return []
        out = result.stdout.strip()
        if out.startswith("["):
            return json.loads(out)
        if out.startswith("{"):
            return [json.loads(out)]
        return []
    except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception):
        return []


def speak_text(text: str, voice_index: int | None = None) -> bool:
    """
    Reproduce texto por voz (Text-to-Speech).

    - Generación de audio a partir de texto: convierte el string en audio y lo reproduce.
    - Calidad optimizada: Rate=0 (velocidad normal), Volume=100.
    - Múltiples voces: si se pasa voice_index (0-based), se selecciona esa voz del sistema.

    Args:
        text: Texto a sintetizar.
        voice_index: Índice de la voz (ver list_voices()). None = voz por defecto.

    Returns:
        True si se lanzó la reproducción correctamente, False si no hay texto, no es Windows o falla.
    """
    if not text or not text.strip():
        return False

    if os.name != "nt":
        return False

    # Escapar comillas simples para PowerShell
    safe_text = text.replace("'", "''").replace("\r", " ").replace("\n", " ")

    parts = [
        "Add-Type -AssemblyName System.Speech; ",
        "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; ",
        "$synth.Rate = 0; ",
        "$synth.Volume = 100; ",
    ]
    if voice_index is not None and voice_index >= 0:
        parts.append(
            f"$v = $synth.GetInstalledVoices(); "
            f"if ($v.Count -gt {voice_index}) {{ $synth.SelectVoice($v[{voice_index}].VoiceInfo.Name) }} "
        )
    parts.append(f"$synth.Speak('{safe_text}')")

    command = "".join(parts)

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
