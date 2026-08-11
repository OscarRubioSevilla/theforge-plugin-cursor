# Forge Arquitecto de Contratos API (§4) (pipeline MDD local)

**No usar The Forge API.** Profundidad MDD **enterprise siempre activa**.

## Rol

Nodo Forge: `api_contracts`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/.pipeline/clarifier-output.md
- docs/sdd/.pipeline/data-model-draft.md
- docs/sdd/.pipeline/stack-draft.md (si high_split)
- paso0/decisions.catalog.json

## Salidas

- docs/sdd/.pipeline/api-contracts-draft.md — §4

## Prompt Forge (referencia)

**Leer prompt completo** en `prompts/mdd/software-architect-prompt.md` **y** `prompts/mdd/software-architect-prompt-api-contracts.md` (no resumir ni omitir secciones enterprise).

Ruta(s): `prompts/mdd/software-architect-prompt-api-contracts.md`

Obligaciones clave (resumen; **no sustituye** leer el prompt completo):

- Checklist antes de `passed`: tabla §4.A **y** ≥1 bloque JSON; ratio ≥60% endpoints con JSON
- Cada POST/PATCH/DELETE/PUT: subsección `### METHOD /path` + request/response JSON + 4xx
- GET: fila resumen; detalle con response JSON cuando aplique
- Dueño de `mandatoryApiRouteFamilies[]` → §4.A: cada `pathPattern` documentado
- Tipos JSON alineados a columnas §3 (UUID, etc.)

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: api_contracts` al iniciar.
2. Marcar agente `api_contracts` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-section5`
