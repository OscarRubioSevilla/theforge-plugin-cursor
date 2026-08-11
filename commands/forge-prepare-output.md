# Forge Preparar salida y delivery gate (pipeline MDD local)

**No usar The Forge API.**

## Rol

Nodo Forge: `prepare_output`. Paridad con grafo MDD one-shot.

## Entradas

- Todos los sidecars en docs/sdd/.pipeline/
- WORKFLOW.yaml pipeline state

## Salidas

- docs/sdd/mdd.md — documento consolidado final
- pipeline.delivery_gate (score, blockers, fix_target)

## Prompt Forge (referencia)

Leer prompt empaquetado en el plugin Forge SDD:

`(determinístico) skill forge-workflow — merge sidecars → mdd.md`

Obligaciones clave (resumen; no copiar el prompt completo):

- Merge §1–§7 desde sidecars; eliminar placeholders
- Inyectar §0 **solo si** el catálogo declara `architecturePatterns[]`; si no, **no** añadir wizard de patrones
- Append §10 Registro de cambios tras §9
- Ejecutar `npm run validate:paso0-coverage`; **no** marcar `paso0_mdd_coverage` si hay blockers
- Ejecutar `npm run validate:mdd-depth`; **no** marcar `gates.mdd` si score < 90 o hay blockers
- Asegurar §8 UI/UX y §9 Trazabilidad (plantilla: `paso0/mdd-sections-template.md`)
- Evaluar delivery gate (umbral 90, MIN_SECTION_BODY 200 chars, §3 ≥100 si CREATE TABLE)
- Si falla: marcar fix_target y re-enrutar agente (max 2 iteraciones)
- Si ambos gates ok: marcar agente `passed`; **siguiente** `/forge-paso0-coverage-remediation`

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: prepare_output` al iniciar.
2. Marcar agente `prepare_output` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-paso0-coverage-remediation` o re-ejecutar agente indicado por fix_target
