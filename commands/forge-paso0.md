# Forge Paso 0 (local)

**No usar The Forge API.** Rutas relativas al workspace del proyecto.

## Modos de profundidad

Leer `WORKFLOW.yaml` → `paso0.depth` (default: **deep** si no está definido).

| Modo | D-IDs objetivo | Líneas benchmark | Uso |
|------|----------------|------------------|-----|
| **deep** | 40–80 (~50) | 800–2000 | MVP funcional y desplegable (default) |
| **standard** | ~20 | 300–600 | Spikes, demos YAGNI |

Guía obligatoria: `paso0/DEEP-PASO0-GUIDE.md`. Plantilla: `paso0/TEMPLATE.md`.

## Entradas

1. `WORKFLOW.yaml` (`project.idea`, `paso0.depth`, `paso0.target_decision_count`)
2. `paso0/TEMPLATE.md`
3. `paso0/DEEP-PASO0-GUIDE.md`
4. Idea del usuario en chat (si amplía el alcance)

## Obligaciones del agente

### Modo deep (default)

1. **Investigar mercado** con búsqueda web: 3–5 competidores, diferenciación, regulación si aplica.
2. Rellenar `paso0/domain-benchmark.md` con **todas** las secciones de la plantilla (mercado, personas, unit economics, ops, production checklist, entidades, API, BR-xxx, NFR cuantificados, riesgos, glosario).
3. Generar **≥40 D-IDs** (objetivo `paso0.target_decision_count`, típico 50). Cada ítem de production readiness y NFR medible lleva D-ID.
4. Sincronizar `paso0/decisions.catalog.json`:
   - Obligatorios: `decisions[]`, `mvpCapabilities[]`, `entities[]`, `outOfScope[]`, `canonicalEntities[]`, `mandatoryApiRouteFamilies[]`, `businessRules[]`, `risks[]`
   - Opcionales (rellenar en deep): `architecturePatterns[]`, `rejectedPatterns[]`, `personas[]`, `competitors[]`, `nfrQuantified[]`, `productionChecklist[]`
5. Marcar **Inferencia aceptada** vs **Decisión confirmada** según `DEEP-PASO0-GUIDE.md`.
6. Auto-revisión antes de cerrar: contar D-IDs, entidades (≥8), familias API (≥6), BR (≥10), NFR (≥6 con unidad).

### Modo standard

1. Secciones esenciales: síntesis, decisiones (~20 D-IDs), MVP, fuera de alcance, glosario, riesgos.
2. Sync mínimo del catálogo (campos obligatorios).
3. Omitir investigación de mercado extensa salvo petición del usuario.

## Salidas

- `paso0/domain-benchmark.md` — benchmark completo
- `paso0/decisions.catalog.json` — `kind: paso0_decision_catalog`, `version: 1`
- `WORKFLOW.yaml` — `phase: paso0`, `gates.paso0.status: passed`

## Anti-patrones

- Benchmark &lt; 800 líneas en deep con &lt; 40 D-IDs
- NFR cualitativos sin cifras
- D-IDs o patrones copiados de otro proyecto
- JSON desincronizado respecto al markdown

## Siguiente

`/forge-spec`
