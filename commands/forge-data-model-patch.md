# Forge Parche de Modelo de Datos (pipeline MDD local)

**No usar The Forge API.** Profundidad MDD **enterprise siempre activa**.

> **Opcional:** solo si el critic o delivery gate lo exige.


## Rol

Nodo Forge: `data_model_patch`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/.pipeline/critic-feedback.json
- docs/sdd/.pipeline/data-model-draft.md

## Salidas

- docs/sdd/.pipeline/data-model-patch.md — parches §3

## Prompt Forge (referencia)

Leer prompt empaquetado: `prompts/mdd/software-architect-prompt-data-model.md`

Ruta(s): `prompts/mdd/software-architect-prompt-data-model.md`

Obligaciones clave (resumen; **no sustituye** leer el prompt completo):

- Solo corregir tablas/columnas señaladas por el critic (gaps «solo tabla»)
- Merge mínimo; no reescribir §3 entero

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: data_model_patch` al iniciar.
2. Marcar agente `data_model_patch` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-architect-critic` (re-evaluación)
