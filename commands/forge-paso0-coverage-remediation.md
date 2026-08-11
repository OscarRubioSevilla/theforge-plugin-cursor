# Forge Remediación cobertura Paso 0 (pipeline MDD local)

**No usar The Forge API.**

## Rol

Nodo Forge: `paso0_coverage_remediation`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/mdd.md (post prepare_output)
- paso0/decisions.catalog.json
- deliverables/paso0-coverage-report.json

## Salidas

- docs/sdd/mdd.md — parches §0, §1 glosario, §1.7 riesgos, §1.8 D-IDs, §4 familias API, §9/§10
- deliverables/paso0-remediation-log.json
- deliverables/paso0-coverage-report.json (re-validado)

## Prompt Forge (referencia)

Leer prompt empaquetado en el plugin Forge SDD:

`(determinístico) scripts/remediate-paso0-coverage.mjs`

Obligaciones clave (resumen; no copiar el prompt completo):

- Ejecutar `npm run remediate:paso0-coverage` (loop validate→patch, max 3 iteraciones)
- Parches deterministas: §0 patrones, términos §1.5, tabla R-xxx §1.7, D-IDs §1.8, rutas §4.A
- **Regenerar §9** tras cada iteración; asegurar §10 changelog
- Si quedan blockers no deterministas: **una** pasada LLM semántica por categoría
- No marcar `gates.paso0_mdd_coverage` hasta `validate:paso0-coverage` exit 0
- Al pasar: `gates.paso0_mdd_coverage.status: passed`, `gates.mdd.status: passed`, `phase: gates`

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: paso0_coverage_remediation` al iniciar.
2. Marcar agente `paso0_coverage_remediation` con `status: running` → `passed` (o `failed` / `skipped`).
3. Post-proceso automático tras prepare_output; Cursor-only

## Siguiente

`/forge-gate`
