# Recognition

Pipeline de reconocimiento de lenguaje de senas.

## Alcance

- letters/: reconocimiento de letras (gestos estaticos)
- words/: reconocimiento de palabras (secuencias de movimiento)
- pipeline.py: orquestacion minima para inferencia por frame

## Entrada estandar

Lista de landmarks con 21 puntos:

[[x, y, z], ...]

## Salida estandar

Texto detectado por el modelo y metadatos basicos.
