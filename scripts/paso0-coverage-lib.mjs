/**
 * Utilidades compartidas para validación Paso 0 → MDD y generación de §9.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const workspaceRoot = join(__dirname, "..");

export const DEFAULT_PATHS = {
  catalog: join(workspaceRoot, "paso0/decisions.catalog.json"),
  mdd: join(workspaceRoot, "docs/sdd/mdd.md"),
  benchmark: join(workspaceRoot, "paso0/domain-benchmark.md"),
  report: join(workspaceRoot, "deliverables/paso0-coverage-report.json"),
};

export function loadCatalog(catalogPath = DEFAULT_PATHS.catalog) {
  if (!existsSync(catalogPath)) {
    throw new Error(`Catálogo no encontrado: ${catalogPath}`);
  }
  const raw = readFileSync(catalogPath, "utf8");
  const catalog = JSON.parse(raw);
  if (catalog.kind !== "paso0_decision_catalog") {
    throw new Error(`kind inválido: ${catalog.kind ?? "(ausente)"}`);
  }
  return catalog;
}

export function loadMdd(mddPath = DEFAULT_PATHS.mdd) {
  if (!existsSync(mddPath)) {
    throw new Error(`MDD no encontrado: ${mddPath}`);
  }
  return readFileSync(mddPath, "utf8");
}

/** Extrae cuerpo de sección ## N. hasta la siguiente ## numerada. */
export function extractSection(markdown, sectionNum) {
  const headingRe = new RegExp(`^##\\s+${sectionNum}\\.?\\s+[^\\n]*$`, "im");
  const heading = headingRe.exec(markdown ?? "");
  if (!heading) return "";
  const start = heading.index + heading[0].length;
  const rest = (markdown ?? "").slice(start);
  const next = /^##\s+\d+\.\s+/m.exec(rest);
  const end = next ? start + next.index : markdown.length;
  return markdown.slice(start, end).trim();
}

export function hasDecisionId(corpus, id) {
  return new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(corpus ?? "");
}

export function normalizeTerm(term) {
  return (term ?? "").replace(/`/g, "").trim();
}

export function termPresentInText(text, term) {
  const normalized = normalizeTerm(term);
  if (!normalized) return false;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i").test(text ?? "");
}

export function hasCreateTable(section3, entityName) {
  const name = entityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:["'\`]?[a-zA-Z_][a-zA-Z0-9_]*["'\`]?\\.)?["'\`]?${name}["'\`]?\\s*\\(`,
    "i",
  );
  return re.test(section3 ?? "");
}

export function hasApiPath(corpus, pathPattern) {
  const pattern = (pathPattern ?? "").trim();
  if (!pattern) return false;
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped).test(corpus ?? "");
}

export function hasBusinessRule(section5, ruleId) {
  const id = ruleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${id}\\b`).test(section5 ?? "");
}

export function hasRiskReference(corpus, risk) {
  if (hasDecisionId(corpus, risk.id)) return true;
  const mitigation = (risk.mitigation ?? "").trim();
  if (mitigation.length >= 8 && corpus.toLowerCase().includes(mitigation.toLowerCase())) {
    return true;
  }
  const nameSnippet = (risk.name ?? "").slice(0, 48).trim();
  if (nameSnippet.length >= 16) {
    const words = nameSnippet.split(/\s+/).slice(0, 4).join(" ");
    if (words.length >= 12 && corpus.toLowerCase().includes(words.toLowerCase())) {
      return true;
    }
  }
  return false;
}

export function hasSection9(markdown) {
  return /^##\s+9\.?\s+Trazabilidad\b/im.test(markdown ?? "");
}

export function hasSection8(markdown) {
  return /^##\s+8\.?\s+/im.test(markdown ?? "") || /^##\s+UI\/UX\b/im.test(markdown ?? "");
}

export function hasSection0(markdown) {
  return /\[ARQUITECTURA\s*[—–-]\s*SECCIÓN INMUTABLE\]/i.test(markdown ?? "");
}

export function hasSection10(markdown) {
  return /^##\s+10\.?\s+Registro de cambios\b/im.test(markdown ?? "");
}

/** Excluye §9 y §10 del corpus para evitar auto-referencia en validación y §9. */
export function stripSectionsForCoverageScan(markdown) {
  let m = markdown ?? "";
  m = m.replace(/\n##\s+9\.?\s+Trazabilidad[\s\S]*?(?=\n##\s+10\.|\s*$)/i, "");
  m = m.replace(/\n##\s+10\.?\s+Registro de cambios[\s\S]*$/i, "");
  return m;
}

/** Bloque §0 — patrones inmutables derivados del catálogo Paso 0. */
export function buildSection0Markdown(_catalog) {
  return `## [ARQUITECTURA — SECCIÓN INMUTABLE] CONFIGURACIÓN DE PATRONES DE DESARROLLO

### Patrones activos (SSOT)

#### 🏛️ 1. Arquitectura global y distribuida
- [X] **Arquitectura Hexagonal (Ports & Adapters)** — aísla el dominio de adaptadores de aplicación productora, persistencia y transporte. Requisito para que el núcleo sea reutilizable entre aplicaciones (D-002).
- [X] **Monolito Modular** — una unidad de despliegue con módulos de negocio separados. Coherente con la operación proporcional confirmada (D-111).
- [X] **Event-Driven Architecture (EDA)** — recepción asíncrona de eventos de negocio (D-080, D-141).

#### 🔌 2. Estructurales (GoF)
- [X] **Facade** — interfaz unificada por superficie de cliente.
- [X] **Adapter** — un adaptador por aplicación productora; traduce su semántica al contrato canónico sin filtrarla al núcleo (D-115, D-005).

#### 🧠 3. Comportamiento (GoF)
- [X] **Observer / Pub-Sub** — distribución de actividad en tiempo real (D-126).
- [X] **State** — máquinas de estado de adjunto (cuarentena), invocación de agente y trabajo de migración.

#### 💾 4. Persistencia y datos
- [X] **Repository** y **Data Mapper** — independencia del dominio respecto del motor, exigida por D-162.
- [X] **Soft Delete / Tombstone** — toda eliminación es lógica (D-023, D-136).

#### 🛡️ 5. Integración, APIs y resiliencia
- [X] **API Gateway** — punto único de entrada, autenticación y rate limiting.
- [X] **BFF (Backend For Frontend)** — tres superficies: embebida, central y móvil (D-123, D-044, D-078).
- [X] **Circuit Breaker** — protege frente a degradación de dependencias externas.
- [X] **Outbox Pattern** — publicación confiable de eventos (D-010).
- [X] **Idempotent Receiver** — deduplicación por \`source_application + event_id\` (D-080).

#### ❌ Patrones explícitamente descartados

| Patrón | Motivo |
|---|---|
| **Strangler Fig** | Implica convivencia y enrutamiento entre sistema legado y nuevo. **D-121 descarta la convivencia operativa**: el corte es por campaña, con congelamiento de escritura, delta final, validación y solo lectura temporal. D-070 prohíbe Teams como puente. |
| **Multi-tenancy** | **D-095** clasifica \`tenant_id\` como frontera futura y **distinta** de \`application_id\`. El eje de aislamiento del MVP es la aplicación (D-093). |
| **CQRS / Event Sourcing** | No hay decisión que lo respalde. El volumen inicial no lo justifica (A-006). |

---

`;
}

export function buildSection10Markdown({
  version = "2.0-local",
  date,
  change,
} = {}) {
  const d = date ?? new Date().toISOString().slice(0, 10);
  const entry =
    change ??
    "Regeneración con §0 patrones inmutables, cobertura Paso 0 completa y §9 trazabilidad sincronizada con validador.";
  return `## 10. Registro de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | — | Versión inicial desde Paso 0 / pipeline SDD Cursor-native. |
| **${version}** | **${d}** | **${entry}** |
`;
}

export function injectSection0(markdown, catalog) {
  if (hasSection0(markdown)) return markdown;
  const section0 = buildSection0Markdown(catalog);
  const anchor = /^##\s+1\./m;
  if (anchor.test(markdown)) {
    return markdown.replace(anchor, `${section0}$&`);
  }
  return `${markdown.trimEnd()}\n\n${section0}`;
}

export function appendSection10(markdown, options = {}) {
  if (hasSection10(markdown)) return markdown;
  const section10 = buildSection10Markdown(options);
  return `${markdown.trimEnd()}\n\n${section10}\n`;
}

export function ensureSupplementalSections(markdown, catalog, section10Options = {}) {
  let m = injectSection0(markdown, catalog);
  m = appendSection10(m, section10Options);
  return m;
}

/** D-IDs únicos MVP o Decisión confirmada. */
export function listRequiredDecisionIds(catalog) {
  const ids = new Set();
  for (const d of catalog.decisions ?? []) {
    if (d.classification === "MVP" || d.assertionType === "Decisión confirmada") {
      ids.add(d.id);
    }
  }
  return [...ids].sort();
}

/** Detecta en qué sección principal aparece cada D-ID. */
export function scanDecisionIdSections(markdown) {
  const sections = [];
  const s0Match = /##\s+\[ARQUITECTURA[\s\S]*?(?=^##\s+1\.)/im.exec(markdown ?? "");
  if (s0Match) sections.push({ num: 0, body: s0Match[0] });
  for (let n = 1; n <= 10; n++) {
    sections.push({ num: n, body: extractSection(markdown, n) });
  }
  const tail = markdown.split(/^##\s+8/mi).slice(1).join("");
  if (tail) sections.push({ num: "8+", body: tail });

  return (id) => {
    const hits = [];
    for (const s of sections) {
      if (s.body && hasDecisionId(s.body, id)) hits.push(`§${s.num}`);
    }
    if (hits.length === 0 && hasDecisionId(markdown, id)) hits.push("documento");
    return hits;
  };
}

export function validatePaso0MddCoverage({ catalog, mdd, includeWarnings = false } = {}) {
  const corpus = mdd ?? "";
  const coverageCorpus = stripSectionsForCoverageScan(corpus);
  const section1 = extractSection(coverageCorpus, 1);
  const section3 = extractSection(coverageCorpus, 3);
  const section4 = extractSection(coverageCorpus, 4);
  const section5 = extractSection(coverageCorpus, 5);
  const section4Corpus = section4 || coverageCorpus;

  const missingBySection = {
    section0_patterns: [],
    section1_glossary: [],
    section1_outOfScope: [],
    section3_canonicalEntities: [],
    section4_apiRouteFamilies: [],
    section4_apiPaths: [],
    section5_businessRules: [],
    mvpCapabilities: [],
    risks: [],
    decisions_mvp_confirmada: [],
    section9_trazabilidad: [],
    section8_uiux: [],
    section10_changelog: [],
  };

  const blockers = [];

  // canonicalEntities → §3
  const canonicalEntities = catalog.canonicalEntities ?? [];
  for (const entity of canonicalEntities) {
    if (!hasCreateTable(section3, entity)) {
      missingBySection.section3_canonicalEntities.push(entity);
      blockers.push(`§3: falta CREATE TABLE para entidad canónica \`${entity}\``);
    }
  }

  // mandatoryApiRouteFamilies → §4
  for (const family of catalog.mandatoryApiRouteFamilies ?? []) {
    const missingPaths = (family.pathPatterns ?? []).filter(
      (p) => !hasApiPath(section4Corpus, p),
    );
    if (missingPaths.length > 0) {
      missingBySection.section4_apiRouteFamilies.push({
        id: family.id,
        label: family.label,
        missingPaths,
      });
      for (const p of missingPaths) {
        missingBySection.section4_apiPaths.push(p);
        blockers.push(`§4: falta pathPattern \`${p}\` (familia ${family.id})`);
      }
    }
  }

  // businessRules → §5
  for (const rule of catalog.businessRules ?? []) {
    if (!hasBusinessRule(section5, rule.id)) {
      missingBySection.section5_businessRules.push(rule.id);
      blockers.push(`§5: falta regla de negocio ${rule.id}`);
    }
  }

  // mvpCapabilities → decisionIds en mdd (excl. §9/§10)
  for (const cap of catalog.mvpCapabilities ?? []) {
    const missingIds = (cap.decisionIds ?? []).filter((id) => !hasDecisionId(coverageCorpus, id));
    if (missingIds.length > 0) {
      missingBySection.mvpCapabilities.push({
        title: cap.title,
        missingDecisionIds: missingIds,
      });
      blockers.push(
        `mvpCapabilities: "${cap.title}" sin D-IDs en MDD: ${missingIds.join(", ")}`,
      );
    }
  }

  // outOfScope → decisionIds in mdd o texto de regla en §1
  for (const item of catalog.outOfScope ?? []) {
    const idsOk = (item.decisionIds ?? []).every((id) => hasDecisionId(coverageCorpus, id));
    const ruleOk = termPresentInText(section1, item.rule);
    if (!idsOk && !ruleOk) {
      missingBySection.section1_outOfScope.push({
        rule: item.rule,
        decisionIds: item.decisionIds ?? [],
      });
      blockers.push(
        `§1 fuera de alcance: ni D-IDs (${(item.decisionIds ?? []).join(", ")}) ni texto "${item.rule.slice(0, 60)}…"`,
      );
    }
  }

  // entities (glosario) → §1
  for (const entity of catalog.entities ?? []) {
    if (!termPresentInText(section1, entity.term)) {
      missingBySection.section1_glossary.push(entity.term);
      blockers.push(`§1 glosario: falta término "${normalizeTerm(entity.term)}"`);
    }
  }

  // risks → R-xxx o mitigación (corpus completo incl. §9/§10)
  for (const risk of catalog.risks ?? []) {
    if (!hasRiskReference(corpus, risk)) {
      missingBySection.risks.push(risk.id);
      blockers.push(`Riesgo ${risk.id} sin referencia (id o mitigación) en MDD`);
    }
  }

  // decisions MVP / confirmada (excl. §9/§10)
  const requiredIds = listRequiredDecisionIds(catalog);
  for (const id of requiredIds) {
    if (!hasDecisionId(coverageCorpus, id)) {
      missingBySection.decisions_mvp_confirmada.push(id);
      blockers.push(`D-ID obligatorio ausente en MDD: ${id}`);
    }
  }

  // section0 — patrones inmutables
  if (!hasSection0(corpus)) {
    missingBySection.section0_patterns.push("## [ARQUITECTURA — SECCIÓN INMUTABLE]");
    blockers.push("§0: falta sección inmutable de patrones de desarrollo");
  }

  // section9
  if (!hasSection9(corpus)) {
    missingBySection.section9_trazabilidad.push("## 9. Trazabilidad");
    blockers.push("§9: falta sección ## 9. Trazabilidad");
  }

  // section10
  if (!hasSection10(corpus)) {
    missingBySection.section10_changelog.push("## 10. Registro de cambios");
    blockers.push("§10: falta sección ## 10. Registro de cambios");
  }

  if (includeWarnings && !hasSection8(corpus)) {
    missingBySection.section8_uiux.push("## 8. UI/UX");
  }

  const stats = {
    canonical_entities_total: canonicalEntities.length,
    canonical_entities_in_section3:
      canonicalEntities.length - missingBySection.section3_canonicalEntities.length,
    canonical_entities_in_section3_ratio:
      canonicalEntities.length === 0
        ? 1
        : (canonicalEntities.length - missingBySection.section3_canonicalEntities.length) /
          canonicalEntities.length,
    mandatory_api_families_total: (catalog.mandatoryApiRouteFamilies ?? []).length,
    mandatory_api_families_in_section4:
      (catalog.mandatoryApiRouteFamilies ?? []).length -
      missingBySection.section4_apiRouteFamilies.length,
    mandatory_api_families_in_section4_ratio:
      (catalog.mandatoryApiRouteFamilies ?? []).length === 0
        ? 1
        : ((catalog.mandatoryApiRouteFamilies ?? []).length -
            missingBySection.section4_apiRouteFamilies.length) /
          (catalog.mandatoryApiRouteFamilies ?? []).length,
    business_rules_total: (catalog.businessRules ?? []).length,
    business_rules_in_section5:
      (catalog.businessRules ?? []).length - missingBySection.section5_businessRules.length,
    business_rules_in_section5_ratio:
      (catalog.businessRules ?? []).length === 0
        ? 1
        : ((catalog.businessRules ?? []).length - missingBySection.section5_businessRules.length) /
          (catalog.businessRules ?? []).length,
    mvp_capabilities_total: (catalog.mvpCapabilities ?? []).length,
    mvp_capabilities_covered:
      (catalog.mvpCapabilities ?? []).length - missingBySection.mvpCapabilities.length,
    glossary_terms_total: (catalog.entities ?? []).length,
    glossary_terms_in_section1:
      (catalog.entities ?? []).length - missingBySection.section1_glossary.length,
    risks_total: (catalog.risks ?? []).length,
    risks_referenced: (catalog.risks ?? []).length - missingBySection.risks.length,
    mvp_decision_ids_total: requiredIds.length,
    mvp_decision_ids_in_mdd:
      requiredIds.length - missingBySection.decisions_mvp_confirmada.length,
    mvp_decision_ids_in_mdd_ratio:
      requiredIds.length === 0
        ? 1
        : (requiredIds.length - missingBySection.decisions_mvp_confirmada.length) /
          requiredIds.length,
    section9_present: hasSection9(corpus),
    section8_present: hasSection8(corpus),
    section0_present: hasSection0(corpus),
    section10_present: hasSection10(corpus),
    blockers_count: blockers.length,
  };

  return {
    passed: blockers.length === 0,
    missingBySection,
    stats,
    blockers,
    validatedAt: new Date().toISOString(),
    sources: {
      catalog: DEFAULT_PATHS.catalog,
      mdd: DEFAULT_PATHS.mdd,
    },
  };
}
