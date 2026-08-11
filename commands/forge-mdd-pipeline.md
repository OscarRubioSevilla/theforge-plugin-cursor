# Forge MDD Pipeline — orquestador completo

**No usar The Forge API.**

Ejecuta el pipeline multi-agente local con paridad al grafo MDD one-shot de The Forge.

## Prerrequisitos

1. `gates.spec.status: passed` en `WORKFLOW.yaml`
2. Paso 0 **deep** recomendado (40–80 D-IDs); profundidad MDD **enterprise siempre** (no tier standard)
3. `phase: mdd` o `phase: mdd_pipeline`

## Configuración

Editar `WORKFLOW.yaml`:

- `mdd.depth: enterprise` (default del scaffold; no desactivar)
- `pipeline.mode`: `monolithic` (LOW/MEDIUM) o `high_split` (HIGH)
- Resetear agentes a `pending` (o `skipped` según rama)
- `pipeline.current_agent: clarifier`

## Secuencia (ejecutar en orden)

### Rama monolithic (`pipeline.mode: monolithic`)

1. `/forge-clarifier`
2. `/forge-software-architect`
3. `/forge-architect-critic` → (opcional) `/forge-data-model-patch`
4. `/forge-section5`
5. `/forge-formatter` (after_architect)
6. `/forge-security-integration`
7. `/forge-formatter` (after_redactor)
8. En paralelo: `/forge-cross-consistency` + `/forge-diagram-injector`
9. `/forge-auditor`
10. `/forge-prepare-output`
11. `/forge-paso0-coverage-remediation`

### Rama high_split (`pipeline.mode: high_split`)

1. `/forge-clarifier`
2. `/forge-stack-architect` → `/forge-data-model`
3. `/forge-architect-critic` → `/forge-api-contracts`
4. `/forge-section5`
5. Pasos 5–11 iguales que rama monolithic

## Post-proceso cobertura Paso 0

Tras `/forge-prepare-output`, ejecutar **siempre** `/forge-paso0-coverage-remediation`.

`/forge-gate` re-valida cobertura antes de `gates.mdd`.

## Cierre

- `phase: gates`
- Sidecars en `docs/sdd/.pipeline/`
- Documento final: `docs/sdd/mdd.md`

**Validación obligatoria:** `npm run validate:paso0-coverage`

**Siguiente:** `/forge-gate`
