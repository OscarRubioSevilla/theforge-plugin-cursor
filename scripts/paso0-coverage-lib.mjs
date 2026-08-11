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

/** True si el catálogo declara patrones de arquitectura explícitos. */
export function catalogHasArchitecturePatterns(catalog) {
  const patterns =
    catalog?.architecturePatterns ?? catalog?.developmentPatterns ?? [];
  return Array.isArray(patterns) && patterns.length > 0;
}

/** D-IDs válidos declarados en cualquier campo del catálogo Paso 0. */
export function listCatalogDecisionIds(catalog) {
  const ids = new Set();
  const add = (list) => {
    for (const id of list ?? []) {
      if (typeof id === "string" && /^D-\d+$/.test(id)) ids.add(id);
    }
  };
  for (const d of catalog?.decisions ?? []) {
    if (d?.id) ids.add(d.id);
  }
  for (const e of catalog?.entities ?? []) add(e.decisionIds);
  for (const r of catalog?.businessRules ?? []) add(r.decisionIds);
  for (const c of catalog?.mvpCapabilities ?? []) add(c.decisionIds);
  for (const o of catalog?.outOfScope ?? []) add(o.decisionIds);
  for (const r of catalog?.risks ?? []) add(r.decisionIds);
  for (const f of catalog?.mandatoryApiRouteFamilies ?? []) add(f.decisionIds);
  for (const p of catalog?.architecturePatterns ?? catalog?.developmentPatterns ?? []) {
    add(p.decisionIds);
  }
  return [...ids].sort();
}

/** Elimina bloque §0 inmutable si existe. */
export function removeSection0(markdown) {
  const m = markdown ?? "";
  if (!hasSection0(m)) return m;
  return m
    .replace(
      /##\s+\[ARQUITECTURA\s*[—–-]\s*SECCIÓN INMUTABLE\][\s\S]*?(?=^##\s+1\.)/im,
      "",
    )
    .replace(/^\n{3,}/m, "\n\n");
}

/** Bloque §0 — solo patrones declarados en el catálogo Paso 0. */
export function buildSection0Markdown(catalog) {
  if (!catalogHasArchitecturePatterns(catalog)) return "";

  const catalogIds = new Set(listCatalogDecisionIds(catalog));
  const patterns =
    catalog.architecturePatterns ?? catalog.developmentPatterns ?? [];

  const lines = [
    "## [ARQUITECTURA — SECCIÓN INMUTABLE] CONFIGURACIÓN DE PATRONES DE DESARROLLO",
    "",
    "### Patrones activos (SSOT — catálogo Paso 0)",
    "",
  ];

  for (const pattern of patterns) {
    const name = pattern.name ?? pattern.title ?? "Patrón";
    const rationale = pattern.rationale ?? pattern.description ?? "";
    const ids = (pattern.decisionIds ?? []).filter((id) => catalogIds.has(id));
    const idSuffix = ids.length ? ` (${ids.join(", ")})` : "";
    lines.push(`- [X] **${name}**${idSuffix}${rationale ? ` — ${rationale}` : ""}`);
  }

  const rejected = catalog.rejectedPatterns ?? catalog.excludedPatterns ?? [];
  if (rejected.length > 0) {
    lines.push("", "#### ❌ Patrones explícitamente descartados", "");
    lines.push("| Patrón | Motivo |", "|---|---|");
    for (const item of rejected) {
      const name = item.name ?? item.pattern ?? "—";
      const reason = item.reason ?? item.motivo ?? "—";
      lines.push(`| **${name}** | ${reason} |`);
    }
  }

  lines.push("", "---", "");
  return `${lines.join("\n")}\n`;
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
  let m = removeSection0(markdown);
  if (!catalogHasArchitecturePatterns(catalog)) return m;
  const section0 = buildSection0Markdown(catalog);
  if (!section0.trim()) return m;
  const anchor = /^##\s+1\./m;
  if (anchor.test(m)) {
    return m.replace(anchor, `${section0}$&`);
  }
  return `${m.trimEnd()}\n\n${section0}`;
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

  // section0 — patrones inmutables (solo si el catálogo los declara)
  if (catalogHasArchitecturePatterns(catalog)) {
    if (!hasSection0(corpus)) {
      missingBySection.section0_patterns.push("## [ARQUITECTURA — SECCIÓN INMUTABLE]");
      blockers.push("§0: falta sección inmutable de patrones de desarrollo (catálogo declara architecturePatterns)");
    }
  } else if (hasSection0(corpus)) {
    missingBySection.section0_patterns.push("§0_contaminada");
    blockers.push(
      "§0: bloque de patrones presente pero el catálogo no declara architecturePatterns — eliminar contaminación de otro dominio",
    );
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
