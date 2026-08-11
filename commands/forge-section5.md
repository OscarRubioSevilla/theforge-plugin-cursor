# Forge Ingeniero §5 Lógica y Edge Cases (pipeline MDD local)

**No usar The Forge API.**

## Rol

Nodo Forge: `section5`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/.pipeline/clarifier-output.md
- §1–§4 consolidados (drafts o mdd-after-architect)
- paso0/domain-benchmark.md

## Salidas

- docs/sdd/.pipeline/section5-draft.md — §5

## Prompt Forge (referencia)

Leer prompt empaquetado en el plugin Forge SDD:

`prompts/mdd/section5-prompt.md`

Obligaciones clave (resumen; no copiar el prompt completo):

- ≥4 reglas BDD/AAA o ≥8 viñetas sustantivas
- Dueño de `businessRules[]` → §5: cada **RN-xx** del catálogo con D-IDs
- RN-XX → BR-XXX + D-IDs; ≥2 escenarios Gherkin
- Cada mutación §4.A con comportamiento/error documentado

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: section5` al iniciar.
2. Marcar agente `section5` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-formatter` (modo after_architect)
