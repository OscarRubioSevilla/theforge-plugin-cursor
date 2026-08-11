# Forge Arquitecto de Software (monolítico) (pipeline MDD local)

**No usar The Forge API.**

> **Omitir cuando:** pipeline.mode = high_split


## Rol

Nodo Forge: `software_architect`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/.pipeline/clarifier-output.md
- paso0/domain-benchmark.md
- paso0/decisions.catalog.json
- docs/sdd/spec.md
- prompts/mdd/mdd-constitution-skeleton.md (plugin Forge SDD)

## Salidas

- docs/sdd/.pipeline/architect-draft.md — §2, §3, §4

## Prompt Forge (referencia)

Leer prompt empaquetado en el plugin Forge SDD:

`prompts/mdd/software-architect-prompt-full.md`

Obligaciones clave (resumen; no copiar el prompt completo):

- §2: stack con «¿Por qué?», Screaming Architecture
- §3: CREATE TABLE + TechnicalMetadata + erDiagram en paridad
- §4.A: tabla de endpoints + JSON request/response por operación
- §4.B solo si Paso 0 nombra integraciones externas
- YAGNI: sin entidades/API no citadas en Paso 0 o clarifiedScope

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: software_architect` al iniciar.
2. Marcar agente `software_architect` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-architect-critic`
