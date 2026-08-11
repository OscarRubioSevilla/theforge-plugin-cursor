# Forge Auditor de Calidad MDD (pipeline MDD local)

**No usar The Forge API.**

## Rol

Nodo Forge: `auditor`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/mdd.md borrador casi final
- paso0 + spec

## Salidas

- docs/sdd/.pipeline/auditor-report.json
- score 0–100, critical_gaps, auditorDecision

## Prompt Forge (referencia)

Leer prompt empaquetado en el plugin Forge SDD:

`prompts/mdd/auditor-prompt.md`

Obligaciones clave (resumen; no copiar el prompt completo):

- Umbral intervención < 85 → clarifier; ≥ 85 → done
- Ejecutar `npm run validate:paso0-coverage` y penalizar score por cada D-ID MVP/confirmada ausente
- Paridad SQL ↔ Mermaid; constitución §1
- Una sola pasada en one-shot (auditorRan)

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: auditor` al iniciar.
2. Marcar agente `auditor` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

Si gaps → agente dueño; si ok → `/forge-prepare-output`
