# Forge Arquitecto de Modelo de Datos (§3) (pipeline MDD local)

**No usar The Forge API.**

## Rol

Nodo Forge: `data_model`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/.pipeline/clarifier-output.md
- docs/sdd/.pipeline/stack-draft.md
- paso0/decisions.catalog.json

## Salidas

- docs/sdd/.pipeline/data-model-draft.md — §3

## Prompt Forge (referencia)

Leer prompt empaquetado en el plugin Forge SDD:

`prompts/mdd/software-architect-prompt-data-model.md`

Obligaciones clave (resumen; no copiar el prompt completo):

- SQL CREATE TABLE válido; TechnicalMetadata por tabla
- erDiagram Mermaid alineado (PK/FK sin comas inválidas)
- Dueño de `canonicalEntities[]` del catálogo → §3: **CREATE TABLE** por cada entidad
- Todas las entidades del glosario §1 materializadas

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: data_model` al iniciar.
2. Marcar agente `data_model` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-architect-critic`
