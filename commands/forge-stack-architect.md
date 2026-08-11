# Forge Arquitecto de Stack (§2) (pipeline MDD local)

**No usar The Forge API.** Profundidad MDD **enterprise siempre activa**.

> **Omitir cuando:** pipeline.mode = monolithic


## Rol

Nodo Forge: `stack_architect`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/.pipeline/clarifier-output.md
- paso0/decisions.catalog.json
- docs/sdd/spec.md

## Salidas

- docs/sdd/.pipeline/stack-draft.md — solo §2

## Prompt Forge (referencia)

Leer prompt empaquetado: `prompts/mdd/software-architect-prompt-stack.md`

Ruta(s): `prompts/mdd/software-architect-prompt-stack.md`

Obligaciones clave (resumen; **no sustituye** leer el prompt completo):

- Solo cuerpo de §2 Arquitectura y Stack
- Decisiones con justificación; coherencia con D-IDs del catálogo
- Reintentar si §2 < 200 chars (máx. 2 intentos en Forge)

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: stack_architect` al iniciar.
2. Marcar agente `stack_architect` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-data-model`
