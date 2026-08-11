# Forge Arquitecto de Modelo de Datos (§3) (pipeline MDD local)

**No usar The Forge API.** Profundidad MDD **enterprise siempre activa**.

## Rol

Nodo Forge: `data_model`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/.pipeline/clarifier-output.md
- docs/sdd/.pipeline/stack-draft.md
- paso0/decisions.catalog.json

## Salidas

- docs/sdd/.pipeline/data-model-draft.md — §3

## Prompt Forge (referencia)

**Leer prompt completo** en `prompts/mdd/software-architect-prompt.md` **y** `prompts/mdd/software-architect-prompt-data-model.md` (no resumir ni omitir secciones enterprise).

Ruta(s): `prompts/mdd/software-architect-prompt-data-model.md`

Obligaciones clave (resumen; **no sustituye** leer el prompt completo):

- TechnicalMetadata + erDiagram **obligatorios** en §3 (gate bloqueante)
- SQL CREATE TABLE válido; TechnicalMetadata por tabla o bloque único
- erDiagram Mermaid en §3 (PK/FK sin comas inválidas; no solo diagram-injector)
- Dueño de `canonicalEntities[]` del catálogo → §3: **CREATE TABLE** por cada entidad
- Todas las entidades del glosario §1 materializadas

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: data_model` al iniciar.
2. Marcar agente `data_model` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-architect-critic`
