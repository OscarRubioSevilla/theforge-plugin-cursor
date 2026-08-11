# Guía Paso 0 profundo (deep)

Playbook para el agente que ejecuta `/forge-paso0`. Objetivo: producir un **Domain Benchmark** y un **`decisions.catalog.json`** lo bastante ricos como para que el pipeline MDD alcance profundidad Forge (~50–80+ D-IDs, MDD 1000+ líneas) sin inventar dominio downstream.

---

## Modos

| Modo | D-IDs objetivo | Líneas benchmark | Cuándo usar |
|------|----------------|------------------|-------------|
| **deep** (default) | 40–80 (objetivo ~50) | 800–2000 | Productos reales, MVP desplegable, mercado nuevo |
| **standard** | ~20 | 300–600 | Prototipos, spikes, demos YAGNI |

Leer `WORKFLOW.yaml` → `paso0.depth`. Si no existe, asumir **`deep`**.

---

## Flujo de trabajo del agente

1. **Leer entradas:** `WORKFLOW.yaml` (`project.idea`, `paso0.depth`), `paso0/TEMPLATE.md`, esta guía.
2. **Investigar mercado (modo deep):** usar **búsqueda web** para competidores, pricing, regulación, tendencias. Citar fuentes en la tabla §3 cuando existan.
3. **Rellenar `paso0/domain-benchmark.md`** siguiendo la plantilla — no omitir secciones marcadas como obligatorias en deep.
4. **Generar D-IDs secuenciales** (`D-001`, `D-002`, …) sin huecos. Cada decisión de producto, NFR, ops o producción merece su D-ID.
5. **Sincronizar `paso0/decisions.catalog.json`** con todos los campos listados en §19 del benchmark.
6. **Auto-revisión:** contar D-IDs, filas de entidades, familias API, BR-xxx, NFR cuantificados. Si deep &lt; 40 D-IDs o &lt; 800 líneas, profundizar antes de cerrar.
7. **Actualizar `WORKFLOW.yaml`:** `phase: paso0`, `gates.paso0.status: passed`, `paso0.target_decision_count` alcanzado.

---

## Investigación de mercado

### Qué buscar

- 3–5 competidores o comparables directos e indirectos.
- Modelos de ingresos y pricing públicos.
- Requisitos regulatorios del país/vertical (pagos, datos personales, sectorial).
- Tamaño de mercado (TAM/SAM/SOM) — opcional; si no hay dato fiable, marcar **Supuesto** con rango explícito.
- Gaps que el MVP puede explotar en el primer año.

### Cómo documentar

| Situación | Tipo de afirmación |
|-----------|-------------------|
| Dato verificado con fuente | Decisión confirmada o Inferencia aceptada + columna Fuente |
| Estimación razonada sin fuerte evidencia | Inferencia aceptada |
| Hipótesis de negocio por validar | Supuesto |
| Bloquea arquitectura o alcance | Pregunta abierta (§17.3) |

**No** copiar bloques genéricos de otros proyectos (Workspace Chat, Strangler, etc.). Los patrones de arquitectura van solo en §9.1 si el dominio los justifica.

---

## Profundidad por sección (modo deep)

| Sección | Mínimo |
|---------|--------|
| Competidores §3.2 | 3 filas |
| Personas §4 | 2 personas |
| Ops §7 | 6 áreas |
| Production checklist §8 | 12 ítems con D-ID |
| D-IDs §9 | 40–60 |
| Capacidades MVP §10 | 8 |
| Fuera de alcance §11 | 6 |
| Entidades canónicas §12 | 8 |
| Familias API §13 | 6 |
| Reglas de negocio §14 | 10 |
| NFR cuantificados §15 | 6 |
| Riesgos §17.1 | 5 |
| Glosario §18 | 12 términos |

---

## Production readiness

El Paso 0 debe **decidir**, no posponer, lo necesario para un MVP en producción modesta:

- AuthN/AuthZ, sesiones, MFA si aplica al dominio.
- Logs estructurados, métricas RED/USE, trazas (OpenTelemetry o equivalente).
- Backups automáticos y RPO/RTO explícitos en §15.
- Entornos separados, secretos fuera del repo, variables por entorno.
- Rate limiting en APIs públicas.
- CI/CD con gate de tests mínimos.
- Health/readiness para orquestador.
- Retención de datos y base legal si hay PII.

Cada ítem del checklist §8 → al menos un D-ID en `decisions[]` y entrada opcional en `productionChecklist[]` del JSON.

---

## Catálogo JSON — campos obligatorios y opcionales

### Obligatorios (validación cobertura MDD)

- `decisions[]`, `mvpCapabilities[]`, `entities[]`, `outOfScope[]`
- `canonicalEntities[]`, `mandatoryApiRouteFamilies[]`, `businessRules[]`, `risks[]`

### Opcionales (metadata enriquecida — no bloquean gate pero alimentan Spec/MDD)

- `architecturePatterns[]`, `rejectedPatterns[]`
- `personas[]`, `competitors[]`, `nfrQuantified[]`, `productionChecklist[]`

Ejemplo de entrada en `decisions[]`:

```json
{
  "id": "D-042",
  "assertionType": "Decisión confirmada",
  "classification": "MVP",
  "rule": "Específica",
  "statement": "Latencia p99 de lectura < 300 ms en endpoints públicos."
}
```

---

## Inferencia vs Decisión confirmada

| Usar **Decisión confirmada** cuando | Usar **Inferencia aceptada** cuando |
|-------------------------------------|-------------------------------------|
| El usuario lo afirmó explícitamente | Conclusión de investigación de mercado |
| Es requisito legal conocido | Pricing estimado sin confirmar con negocio |
| Bloquea MVP o despliegue | Competidor asumido por analogía |
| Aparece en `project.idea` como must-have | Detalle operativo probable pero no validado |

Las inferencias pueden promoverse a confirmadas cuando el usuario valide en chat.

---

## Anti-patrones

- Paso 0 de ~18 D-IDs → MDD ~600 líneas (insuficiente para producción).
- NFR cualitativos (“rápido”, “seguro”) sin cifras.
- Entidades solo en prosa sin listar en §12 / `canonicalEntities[]`.
- Familias API genéricas sin `pathPatterns` concretos.
- Copiar D-IDs o patrones de otro proyecto.
- Benchmark terminado sin actualizar el JSON (desincronización gate).

---

## Criterio de done (gate paso0)

- [ ] `paso0/domain-benchmark.md` completo según profundidad del modo.
- [ ] `paso0/decisions.catalog.json` válido (`kind: paso0_decision_catalog`, `version: 1`).
- [ ] Paridad D-ID: todo id en tablas existe en `decisions[]`.
- [ ] Modo deep: ≥40 D-IDs, ≥8 entidades, ≥6 familias API, ≥10 BR-xxx, ≥6 NFR con unidad.
- [ ] `WORKFLOW.yaml` actualizado.

**Siguiente paso:** `/forge-spec`.
