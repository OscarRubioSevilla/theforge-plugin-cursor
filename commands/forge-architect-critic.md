# Forge Critic del Arquitecto (pipeline MDD local)

**No usar The Forge API.**

## Rol

Nodo Forge: `architect_critic`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/.pipeline/clarifier-output.md (directiva / clarifiedScope)
- §3 y §4 de architect-draft o data-model + api-contracts drafts

## Salidas

- docs/sdd/.pipeline/critic-feedback.json — `{ "verdict": "ok"|"gap", "gaps": [] }`

## Prompt Forge (referencia)

Leer prompt empaquetado en el plugin Forge SDD:

`prompts/mdd/architect-critic-prompt.md`

Obligaciones clave (resumen; no copiar el prompt completo):

- Verificar paridad directiva ↔ SQL ↔ ER ↔ §4
- Detectar domain-auth-only-skew si BRD tiene ≥3 capacidades no-auth
- No inventar requisitos; solo gaps explícitos de la directiva

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: architect_critic` al iniciar.
2. Marcar agente `architect_critic` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

Si gap tablas → `/forge-data-model-patch` o `/forge-data-model`; si ok → `/forge-api-contracts` o `/forge-section5`
