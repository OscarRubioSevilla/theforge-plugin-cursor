# Forge Revisor de Consistencia Cruzada (pipeline MDD local)

**No usar The Forge API.** Profundidad MDD **enterprise siempre activa**.

**Paralelo:** `parallel_group: post_format` — puede ejecutarse junto al otro agente del grupo.


## Rol

Nodo Forge: `cross_consistency_checker`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/.pipeline/mdd-after-redactor.md o mdd.md

## Salidas

- docs/sdd/.pipeline/cross-consistency-patches.json
- Aplicar parches find/replace al borrador

## Prompt Forge (referencia)

Leer prompt empaquetado: `prompts/mdd/cross-consistency-prompt.md`

Ruta(s): `prompts/mdd/cross-consistency-prompt.md`

Obligaciones clave (resumen; **no sustituye** leer el prompt completo):

- Parches mínimos (≤8): tablas §3 ↔ §4 ↔ manifest §7
- Stack §2 ↔ base_image §7; api_prefix consistente
- Responder OK_CONSISTENT si no hay cambios

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: cross_consistency_checker` al iniciar.
2. Marcar agente `cross_consistency_checker` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-diagram-injector` (paralelo) luego `/forge-auditor`
