---
name: forge-workflow
description: >-
  Orquesta el flujo SDD local (Paso 0 → Spec → MDD multi-agente → gates → entregables)
  sin API de The Forge. Usar con WORKFLOW.yaml, pipeline MDD o slash commands /forge-*.
---

# Forge Workflow (Cursor-native)

Flujo **archivos como SSOT** en la raíz del workspace del proyecto. No llamar a The Forge API, MCP TheForge ni jobs LangGraph.

Prompts de agentes: **`prompts/mdd/`** en el plugin Forge SDD instalado (no requieren monorepo The Forge).

## SSOT y rutas (proyecto del usuario)

| Artefacto | Ruta |
|-----------|------|
| Estado | `WORKFLOW.yaml` |
| Pipeline sidecars | `docs/sdd/.pipeline/` |
| Paso 0 benchmark | `paso0/domain-benchmark.md` |
| Catálogo D-ID | `paso0/decisions.catalog.json` |
| Spec | `docs/sdd/spec.md` |
| MDD | `docs/sdd/mdd.md` |
| Panel UI | `ui/` + `node scripts/serve-sdd-ui.mjs` |

## Fases (`WORKFLOW.yaml` → `phase`)

```text
idea → paso0 → spec → mdd → mdd_pipeline → gates → deliverables → done
```

- **mdd** — MDD monolítico rápido (`/forge-mdd`) para demos YAGNI.
- **mdd_pipeline** — pipeline multi-agente (`/forge-mdd-pipeline`).

Tras completar cada fase, actualizar `WORKFLOW.yaml` (`phase`, `gates.*.status`, `pipeline.*`).

## Pipeline MDD multi-agente

Orquestador: `/forge-mdd-pipeline`. Secuencia: clarifier → arquitectos → critic → section5 → formatter → security-integration → consistency/diagram → auditor → prepare-output → paso0-coverage-remediation.

### Post-proceso cobertura Paso 0

Tras `/forge-prepare-output`, **siempre** `/forge-paso0-coverage-remediation`:

```bash
npm run remediate:paso0-coverage
npm run validate:paso0-coverage
```

## Gates mínimos

| Gate | Criterio |
|------|----------|
| paso0 | benchmark + JSON válido; decisiones con D-ID |
| spec | sin clarificaciones abiertas |
| **paso0_mdd_coverage** | validate sin blockers; umbrales 100 % |
| mdd | 7 secciones; **requiere paso0_mdd_coverage** |
| delivery | tasks + artefacto en deliverables/ |

## Comandos

| Fase | Comandos |
|------|----------|
| Scaffold | `/init-forge` (skill init-forge) |
| Paso 0 | `/forge-paso0` |
| Spec | `/forge-spec` |
| MDD rápido | `/forge-mdd` |
| MDD pipeline | `/forge-mdd-pipeline`, `/forge-clarifier`, … |
| Gates | `/forge-gate` |

Al terminar cada comando: resumir cambios, actualizar `WORKFLOW.yaml`, indicar siguiente paso.
