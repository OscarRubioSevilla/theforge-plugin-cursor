# Forge Ingeniero §5 Lógica y Edge Cases (pipeline MDD local)

**No usar The Forge API.** Profundidad MDD **enterprise siempre activa**.

## Rol

Nodo Forge: `section5`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/.pipeline/clarifier-output.md
- docs/sdd/.pipeline/api-contracts-draft.md (**completo**, con JSON §4)
- §1–§3 consolidados (drafts o mdd-after-architect)
- paso0/decisions.catalog.json (`businessRules[]`)
- paso0/domain-benchmark.md

## Salidas

- docs/sdd/.pipeline/section5-draft.md — §5

## Prompt Forge (referencia)

**Leer prompt completo** en `prompts/mdd/section5-prompt.md` (no resumir ni omitir secciones enterprise).

Ruta(s): `prompts/mdd/section5-prompt.md`

Obligaciones clave (resumen; **no sustituye** leer el prompt completo):

- Gherkin: bloque ```gherkin por cada `businessRules[]` (mín. min(BR,8) o 2×BR si BR≤4)
- Cada RN-xx/BR-xxx del catálogo citado en §5 con D-IDs
- ≥ min(4, businessRules.length) subsecciones ### sustantivas
- Cada mutación §4.A con comportamiento/error documentado (4xx, reglas violadas)
- Límite 12000 chars salvo catálogo >10 BR

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: section5` al iniciar.
2. Marcar agente `section5` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-formatter` (modo after_architect)
