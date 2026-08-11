---
name: forge-workflow
description: >-
  Orquesta el flujo SDD local (Paso 0 → Spec → MDD multi-agente → gates → entregables)
  sin API de The Forge. Usar con WORKFLOW.yaml, pipeline MDD o slash commands /forge-*.
disable-model-invocation: true
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

- **mdd** — MDD monolítico rápido (`/forge-mdd`) para demos YAGNI (aun así conviene pasar `validate:mdd-depth` al cerrar).
- **mdd_pipeline** — pipeline multi-agente (`/forge-mdd-pipeline`); profundidad **enterprise siempre**.

Tras completar cada fase, actualizar `WORKFLOW.yaml` (`phase`, `gates.*.status`, `pipeline.*`).

## Profundidad MDD — enterprise (siempre activa)

No existe tier «standard» para el MDD en el plugin: **cada pipeline run** debe cumplir el gate enterprise.

```yaml
mdd:
  depth: enterprise
```

Requisitos bloqueantes (ver `npm run validate:mdd-depth`):

- §4: tabla + JSON; ≥60% endpoints con specs; mutaciones documentadas con 4xx
- §3: CREATE TABLE por entidad canónica, TechnicalMetadata, erDiagram Mermaid
- §5: Gherkin por regla de negocio del catálogo; cada RN-xx/BR-xxx citado
- §7: manifest JSON
- Sin D-IDs extranjeros al catálogo Paso 0

Prompts enterprise en `prompts/mdd/*.md` llevan comentario `Enterprise overlay — re-apply after vendor-prompts`. Tras `npm run vendor-prompts`, re-aplicar esos parches o usar overlay en `prompts/mdd/enterprise/`.

## Paso 0 — profundidad (`paso0.depth`)

| Modo | D-IDs | Benchmark | Cuándo |
|------|-------|-----------|--------|
| **deep** (default) | 40–80 (~50) | 800–2000 líneas | MVP desplegable, producto real |
| **standard** | ~20 | 300–600 líneas | Spikes, demos YAGNI |

Configurar en `WORKFLOW.yaml`:

```yaml
paso0:
  depth: deep  # deep | standard
  target_decision_count: 50
```

Playbook del agente: **`paso0/DEEP-PASO0-GUIDE.md`**. Plantilla: `paso0/TEMPLATE.md`.

Modo **deep** obliga: análisis de mercado (búsqueda web), personas, NFR cuantificados, checklist production readiness, entidades canónicas, familias API, reglas BR-xxx y sync completo de `decisions.catalog.json` (incl. metadata opcional: `personas`, `competitors`, `nfrQuantified`, `productionChecklist`, `architecturePatterns`).

Referencia de calidad: Paso 0 ~18 D-IDs → MDD ~640 líneas; Paso 0 deep 50+ D-IDs → MDD 1000+ líneas tras pipeline.

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
| **mdd_depth** | `npm run validate:mdd-depth` — score ≥ 90, sin D-IDs extranjeros, §4/§5/§7 sustanciales |
| mdd | 7 secciones; **requiere paso0_mdd_coverage + mdd_depth** |
| delivery | tasks + artefacto en deliverables/ |

## Gate profundidad MDD (`validate:mdd-depth`) — **enterprise siempre**

Profundidad **enterprise** no es opcional: cada ejecución del pipeline debe cumplir el gate completo. Configurar en `WORKFLOW.yaml`:

```yaml
mdd:
  depth: enterprise  # no usar standard para MDD
```

Tras merge en `/forge-prepare-output` y antes de marcar `gates.mdd`:

```bash
npm run validate:mdd-depth
```

Comprueba (paridad con delivery gate de The Forge + checks enterprise):

| Check | Umbral |
|-------|--------|
| §1,2,4,5,6,7 cuerpo | ≥ 200 chars (§3 ≥ 100 si CREATE TABLE) |
| §4 sustancia | Tabla resumen **y** bloques JSON |
| §4 schema ratio | ≥ 60% endpoints con `### METHOD /path` + JSON (si ≥5 endpoints) |
| §4 mutaciones | ≥ 60% POST/PATCH/DELETE/PUT con JSON documentado |
| §3 TechnicalMetadata | Bloque fence o sección por tabla |
| §3 erDiagram | ` ```mermaid ` con erDiagram en §3 |
| §3 entidades | CREATE TABLE por cada `canonicalEntities[]` |
| §5 Gherkin | min(BR, 8) bloques, o 2×BR si BR ≤ 4 |
| §5 subsecciones | ≥ min(4, businessRules.length) |
| §5 reglas | Cada RN-xx/BR-xxx del catálogo presente |
| §7 manifest | bloque JSON con stack/deployment/security |
| Líneas totales | WARN si < max(800, D-IDs×15); **blocker** si ≥40 D-IDs y < 1200 líneas |
| D-IDs | ningún D-XXX fuera del catálogo Paso 0 |
| Score | ≥ 90, exit 0 |

Informe: `deliverables/mdd-depth-report.json` (incluye sección `enterprise` y `fix_target`). **No marcar `gates.mdd: passed` si falla.**

Si falla, re-enrutar según `fix_target`: `api_contracts` | `data_model` | `section5` (máx. 2 iteraciones en `pipeline.delivery_gate`).

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
