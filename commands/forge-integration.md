# Forge Ingeniero de Integración (§7) (pipeline MDD local)

**No usar The Forge API.**

> **Opcional:** solo si el critic o delivery gate lo exige.


## Rol

Nodo Forge: `integration`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/mdd.md
- security-draft si existe

## Salidas

- docs/sdd/.pipeline/integration-draft.md — §7

## Prompt Forge (referencia)

Leer prompt empaquetado en el plugin Forge SDD:

`prompts/mdd/integration-engineer-prompt.md`

Obligaciones clave (resumen; no copiar el prompt completo):

- Flujos paso a paso si el usuario los describió en Paso 0
- Manifest JSON final coherente con §2 (Node version, DB engine)
- Loop gate: fix_target = integration

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: integration` al iniciar.
2. Marcar agente `integration` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-formatter` (after_redactor)
