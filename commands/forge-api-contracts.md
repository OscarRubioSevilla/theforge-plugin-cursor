# Forge Arquitecto de Contratos API (§4) (pipeline MDD local)

**No usar The Forge API.**

## Rol

Nodo Forge: `api_contracts`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/.pipeline/clarifier-output.md
- docs/sdd/.pipeline/data-model-draft.md
- docs/sdd/.pipeline/stack-draft.md (si high_split)

## Salidas

- docs/sdd/.pipeline/api-contracts-draft.md — §4

## Prompt Forge (referencia)

Leer prompt empaquetado en el plugin Forge SDD:

`prompts/mdd/software-architect-prompt-api-contracts.md`

Obligaciones clave (resumen; no copiar el prompt completo):

- §4.A obligatoria: tabla resumen + JSON por endpoint
- Dueño de `mandatoryApiRouteFamilies[]` → §4.A: cada `pathPattern` documentado
- Tipos JSON alineados a columnas §3 (UUID, etc.)
- Mín. ~150 chars §4; proyectos grandes: docenas de filas de endpoints

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: api_contracts` al iniciar.
2. Marcar agente `api_contracts` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-section5`
