class SentenceBuilder:
    """
    Acumula letras y palabras reconocidas y construye la oración final.

    Regla:
      - Letras consecutivas se fusionan en una sola palabra: E+D+D+Y → EDDY
      - Signos de palabras van separados por espacio: HOLA
      - Mezcla: HOLA + E+D+D+Y → "HOLA EDDY"
    """

    def __init__(self):
        self._tokens: list[dict] = []

    # ------------------------------------------------------------------
    # Mutators
    # ------------------------------------------------------------------

    def add_letter(self, letter: str) -> None:
        self._tokens.append({"type": "letter", "value": letter.upper()})

    def add_word(self, word: str) -> None:
        self._tokens.append({"type": "word", "value": word.upper()})

    def undo(self) -> str | None:
        """Elimina el último token añadido y devuelve su valor, o None si estaba vacío."""
        if self._tokens:
            return self._tokens.pop()["value"]
        return None

    def clear(self) -> None:
        self._tokens.clear()

    # ------------------------------------------------------------------
    # Build
    # ------------------------------------------------------------------

    def build(self) -> str:
        """Devuelve la oración final fusionando letras contiguas."""
        parts: list[str] = []
        letter_buf: list[str] = []

        for token in self._tokens:
            if token["type"] == "letter":
                letter_buf.append(token["value"])
            else:
                if letter_buf:
                    parts.append("".join(letter_buf))
                    letter_buf.clear()
                parts.append(token["value"])

        if letter_buf:
            parts.append("".join(letter_buf))

        return " ".join(parts)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def preview(self) -> str:
        """Igual que build() pero con el cursor '|' al final para la UI."""
        text = self.build()
        return f"{text}|" if text else "|"

    def __len__(self) -> int:
        return len(self._tokens)
