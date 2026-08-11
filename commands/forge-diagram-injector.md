# Forge Inyector de Diagramas (pipeline MDD local)

**No usar The Forge API.** Profundidad MDD **enterprise siempre activa**.

**Paralelo:** `parallel_group: post_format` — puede ejecutarse junto al otro agente del grupo.


## Rol

Nodo Forge: `diagram_injector`. Paridad con grafo MDD one-shot.

## Entradas

- Borrador post-consistency
- §3 SQL
- §7 infra

## Salidas

- docs/sdd/.pipeline/diagram-injector.md — sugerencias Mermaid
- Completar erDiagram §3 y diagramas de flujo §7 si faltan

## Prompt Forge (referencia)

Leer prompt empaquetado: `(determinístico) skill forge-workflow — erDiagram §3 y flujos §7`

Ruta(s): `(determinístico) skill forge-workflow — erDiagram §3 y flujos §7`

Obligaciones clave (resumen; **no sustituye** leer el prompt completo):

- Solo bloques Mermaid válidos
- erDiagram en paridad con CREATE TABLE
- Paralelo con cross-consistency (parallel_group: post_format)

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: diagram_injector` al iniciar.
2. Marcar agente `diagram_injector` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-auditor`
