# Forge Gate (local)

**No usar The Forge API.**

Validar coherencia **paso0 ↔ spec ↔ mdd**. Informe por gate. Autofix triviales.
Actualizar `gates.*.status` en `WORKFLOW.yaml`.
Si delivery pasa: completar `docs/sdd/tasks.md` y `deliverables/`.

## Validación obligatoria Paso 0 → MDD

Antes de evaluar `gates.mdd` o `gates.delivery`, ejecutar desde la raíz del workspace SDD:

```bash
npm run validate:paso0-coverage
npm run validate:mdd-depth
```

Si hay blockers y aún no se ejecutó remediation en el pipeline:

```bash
npm run remediate:paso0-coverage
```

O usar `/forge-paso0-coverage-remediation` (paso 13 del pipeline MDD).

- Lee `paso0/decisions.catalog.json` + `docs/sdd/mdd.md`
- Escribe `deliverables/paso0-coverage-report.json` y `deliverables/mdd-depth-report.json`
- **Exit code 1** si `blockers.length > 0` o score depth < 90 → gate `paso0_mdd_coverage` / `mdd` = **failed**
- No marcar `gates.mdd.status: passed` sin `gates.paso0_mdd_coverage.status: passed` **y** `validate:mdd-depth` exit 0

## Gates a evaluar

| Gate | Criterio principal |
|------|-------------------|
| **paso0** | `paso0/domain-benchmark.md` + `paso0/decisions.catalog.json` válido; paridad D-IDs |
| **spec** | Sin clarificaciones abiertas; RF con D-IDs; sin stack en spec |
| **paso0_mdd_coverage** | `validate:paso0-coverage` sin blockers; umbrales en `WORKFLOW.yaml` |
| **mdd** | 7 secciones + checklist profundidad + **`validate:mdd-depth` score ≥ 90**; **depende de paso0_mdd_coverage** |
| **delivery** | `tasks.md`, `blueprint.md`, bundle en `deliverables/` |

## Gate `paso0_mdd_coverage` (bloqueante)

Umbrales (`WORKFLOW.yaml` → `gates.paso0_mdd_coverage.threshold`):

| Métrica | Umbral |
|---------|--------|
| `mvp_decision_ids_in_mdd` | 1.0 (100 %) |
| `canonical_entities_in_section3` | 1.0 |
| `mandatory_api_families_in_section4` | 1.0 |
| `business_rules_in_section5` | 1.0 |
| `section9_present` | `true` |

Cobertura por sección (catálogo → MDD):

| Campo catálogo | Sección MDD dueña |
|----------------|-------------------|
| `canonicalEntities` | §3 CREATE TABLE cada una |
| `mandatoryApiRouteFamilies` | §4.A cada `pathPattern` |
| `businessRules` | §5 cada `RN-xx` |
| `mvpCapabilities` | D-IDs en mdd |
| `outOfScope` | D-IDs o texto en §1 |
| `entities` | término en glosario §1 |
| `risks` | `R-xxx` o mitigación |
| D-ID MVP o «Decisión confirmada» | mdd.md (sección dedicada o §9) |

## Checklist MDD (profundidad) — gate `mdd`

Validar cada ítem (detalle en la skill **forge-workflow** del plugin):

### Estructura

- [ ] §1–§7 presentes; sin placeholders «Pendiente».
- [ ] §8 UI/UX y §9 Trazabilidad cuando existe catálogo Paso 0.
- [ ] Sin dominio inventado (entidades/API/infra solo del Paso 0 o Spec).

### §3 Modelo de datos

- [ ] Bloque `sql` coherente con glosario/catálogo.
- [ ] Bloque `TechnicalMetadata`.
- [ ] `mermaid erDiagram` en paridad con SQL.

### §4 Contratos

- [ ] §4.A definida y **antes** de §4.B.
- [ ] Tabla resumen + **request/response JSON por operación**.
- [ ] §4.B omitida o «No aplica» si no hay integraciones en Paso 0.

### §5 Lógica

- [ ] **RN-XX** citando **BR-XXX** y **D-IDs**.
- [ ] ≥4 subsecciones `###` sustantivas o ≥8 viñetas sustantivas.
- [ ] ≥2 escenarios Gherkin.
- [ ] Comportamiento/error documentado para cada mutación de §4.A.

### §6–§7

- [ ] Seguridad acotada al alcance (sin auth OWASP si no hay login).
- [ ] Manifest JSON con `stack`, `deployment`, `security`, `integration_metadata`.

### Trazabilidad y D-IDs

- [ ] Tabla RF ↔ D-IDs ↔ secciones MDD coherente con `docs/sdd/spec.md` §7.
- [ ] `paso0-coverage-report.json` con `passed: true`.
- [ ] `mdd-depth-report.json` con `ok: true` y score ≥ 90.
- [ ] **Sin D-IDs extranjeros** al catálogo Paso 0 (p. ej. D-080/D-121 copiados de otro dominio).

## Gate delivery

- [ ] `docs/sdd/tasks.md` accionable.
- [ ] `docs/sdd/blueprint.md` presente.
- [ ] `deliverables/` con al menos un artefacto exportable.
- [ ] Opcional: `deliverables/gate-report.md` actualizado.

## Salida

1. Resultado de `npm run validate:paso0-coverage` y `npm run validate:mdd-depth` (blockers count, score).
2. Informe breve por gate (passed / failed + hallazgos).
3. Autofix triviales (typos D-ID, claves JSON, headings).
4. Actualizar `WORKFLOW.yaml` y `phase` según resultado global.
