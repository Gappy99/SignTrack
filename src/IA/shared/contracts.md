# IA Contracts

## RecognitionOutput

- label: string
- confidence: number (0 a 1)
- source: string (letter-model o word-model)
- timestamp: string (ISO 8601)

## TranslationInput

- raw_text: string

## TranslationOutput

- normalized_text: string
- changes_applied: string[]
