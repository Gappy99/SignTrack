import re


def _normalize_word_noise(token: str) -> str:
    # Reduce repeticiones exageradas por ruido: BELLLA -> BELLA.
    token = re.sub(r"([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])\1{2,}", r"\1\1", token)
    # Recorta duplicado final por captura extra: HOLAA -> HOLA, BELLAA -> BELLA.
    token = re.sub(r"([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])\1$", r"\1", token)
    return token


def normalize_text(raw_text: str) -> dict:
    """Normaliza texto detectado por el reconocedor.

    Esta version base limpia espacios y aplica capitalizacion basica.
    """
    if raw_text is None:
        return {
            "normalized_text": "",
            "changes_applied": ["null_to_empty"],
        }

    changes = []
    text = raw_text.strip()

    compact = re.sub(r"\s+", " ", text)
    if compact != text:
        changes.append("compact_spaces")
    text = compact

    reduced = " ".join(_normalize_word_noise(token) for token in text.split(" "))
    if reduced != text:
        changes.append("reduce_repeated_letters")
    text = reduced

    if text and text[0].islower():
        text = text[0].upper() + text[1:]
        changes.append("capitalize_first")

    return {
        "normalized_text": text,
        "changes_applied": changes,
    }
