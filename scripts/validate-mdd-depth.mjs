#!/usr/bin/env node
/**
 * Delivery gate local — profundidad enterprise MDD (siempre activa).
 * Paridad con mdd-delivery-gate.util.ts + mdd-content-quality.util.ts.
 * Salida: deliverables/mdd-depth-report.json (+ resumen en stdout)
 * Exit 1 si score < 90 o hay blockers.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractSection,
  hasCreateTable,
  hasBusinessRule,
  listCatalogDecisionIds,
  loadCatalog,
  loadMdd,
} from "./paso0-coverage-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DELIVERY_SCORE_THRESHOLD = 90;
const MIN_SECTION_BODY = 200;
const MIN_SECTION3_BODY = 100;
const BLOCKER_PENALTY = 8;
const CONTRATOS_SCHEMA_RATIO_MIN = 0.6;
const CONTRATOS_SCHEMA_RATIO_MIN_ENDPOINTS = 5;
const MUTATION_JSON_RATIO_MIN = 0.6;

const CANONICAL_SECTIONS = [
  { num: 1, title: "1. Contexto", pattern: /^##\s+1\.\s*Contexto\b/im },
  {
    num: 2,
    title: "2. Arquitectura y Stack",
    pattern: /^##\s+2\.\s*(?:Arquitectura(?:\s+y\s*Stack)?|Stack(?:\s+t[eé]cnico)?)\b/im,
  },
  { num: 3, title: "3. Modelo de Datos", pattern: /^##\s+3\.\s*Modelo\s+(?:de\s+)?datos/im },
  { num: 4, title: "4. Contratos de API", pattern: /^##\s+4\.\s*Contratos\s+de\s+API/im },
  { num: 5, title: "5. Lógica y Edge Cases", pattern: /^##\s+5\.\s*L[oó]gica\s+y\s+Edge\s+Cases/im },
  { num: 6, title: "6. Seguridad", pattern: /^##\s+6\.\s*Seguridad\b|^##\s*Seguridad\b/im },
  {
    num: 7,
    title: "7. Infraestructura",
    pattern: /^##\s+7\.\s*Infraestructura\b|^##\s*Infraestructura\b|^##\s*Integraci[oó]n\b/im,
  },
];

function parseArgs(argv) {
  const opts = {
    root: process.cwd(),
    mdd: null,
    catalog: null,
    report: null,
    jsonOnly: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--root" && argv[i + 1]) opts.root = argv[++i];
    else if (arg === "--mdd" && argv[i + 1]) opts.mdd = argv[++i];
    else if (arg === "--catalog" && argv[i + 1]) opts.catalog = argv[++i];
    else if (arg === "--report" && argv[i + 1]) opts.report = argv[++i];
    else if (arg === "--json-only") opts.jsonOnly = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Uso: node scripts/validate-mdd-depth.mjs [--root PATH] [--mdd PATH] [--catalog PATH]",
          "     [--report PATH] [--json-only]",
          "",
          "Valida profundidad enterprise §1–§7 (JSON por mutación, TechnicalMetadata, erDiagram, Gherkin por BR).",
          `Umbral: score >= ${DELIVERY_SCORE_THRESHOLD}, sin blockers.`,
        ].join("\n"),
      );
      process.exit(0);
    }
  }
  opts.mdd = opts.mdd ?? join(opts.root, "docs/sdd/mdd.md");
  opts.catalog = opts.catalog ?? join(opts.root, "paso0/decisions.catalog.json");
  opts.report = opts.report ?? join(opts.root, "deliverables/mdd-depth-report.json");
  return opts;
}

function extractSectionBody(draft, num) {
  const trimmed = (draft ?? "").trim();
  if (!trimmed) return null;
  const entry = CANONICAL_SECTIONS.find((s) => s.num === num);
  if (!entry) return null;

  const lines = trimmed.split("\n");
  let headingLineIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (entry.pattern.test(lines[i])) {
      headingLineIdx = i;
      break;
    }
  }
  if (headingLineIdx === -1) return null;

  const headingLine = lines[headingLineIdx];
  const headingMatch = headingLine.match(entry.pattern);
  const bodyStartsOnSameLine =
    headingMatch != null && headingLine.slice(headingMatch[0].length).trim().length > 0;
  const inlineBodyPrefix = bodyStartsOnSameLine
    ? headingLine.slice(headingMatch[0].length).replace(/^\s+/, "")
    : null;

  let inFence = false;
  const bodyLines = [];
  if (inlineBodyPrefix) bodyLines.push(inlineBodyPrefix);
  for (let i = headingLineIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^[ \t]*```/.test(line)) {
      inFence = !inFence;
      bodyLines.push(line);
      continue;
    }
    if (!inFence) {
      const nextNumMatch = line.match(/^##\s+(\d+)\./);
      if (nextNumMatch && parseInt(nextNumMatch[1], 10) > num) break;
      if (num >= 6) {
        if (/^##\s+Seguridad\b/.test(line) && num !== 6) break;
        if (/^##\s+Infraestructura\b|^##\s+Integraci[oó]n\b/.test(line) && num !== 7) break;
      }
    }
    bodyLines.push(line);
  }
  return bodyLines.join("\n").replace(/^\s*\n+/, "").trim();
}

function validateMddStructure(draft) {
  const missingSections = [];
  for (const entry of CANONICAL_SECTIONS) {
    if (!entry.pattern.test(draft ?? "")) {
      missingSections.push(entry.title);
    }
  }
  return { missingSections };
}

function isPipelinePlaceholder(body) {
  const b = (body ?? "").trim();
  if (!b) return true;
  if (/^\(Pendiente(?::|\))/i.test(b)) return true;
  if (/Pendiente:\s*Arquitecto/i.test(b)) return true;
  return false;
}

function hasCrossReference(body) {
  return /Ver\s+§\d/i.test(body ?? "");
}

function countContratosEndpointRows(section4) {
  const tableRows = (section4 ?? "").match(/^\| (GET|POST|PATCH|DELETE|PUT) \|/gm);
  const headingRows = (section4 ?? "").match(/^###\s+(GET|POST|PATCH|DELETE|PUT)\s+/gim);
  return Math.max(tableRows?.length ?? 0, headingRows?.length ?? 0);
}

/** Enterprise: tabla resumen Y al menos un bloque ```json. */
function isContratosSubstantial(section4) {
  const body = section4 ?? "";
  if (body.length < 80) return false;
  if (/Falta:\s*definir endpoints/i.test(body)) return false;
  const hasJson = /```json/i.test(body);
  const hasTable = /^\| (GET|POST|PATCH|DELETE|PUT) \|/m.test(body);
  return hasTable && hasJson;
}

function extractEndpointHeadings(contratosBody) {
  return [...(contratosBody ?? "").matchAll(/^###\s+(GET|POST|PUT|DELETE|PATCH)\s+(\S+)/gim)].map(
    (m) => ({ method: m[1].toUpperCase(), path: m[2] }),
  );
}

function computeContratosSchemaRatio(contratosBody) {
  const body = contratosBody ?? "";
  const headings = extractEndpointHeadings(body);
  if (headings.length === 0) return { totalEndpoints: 0, endpointsWithSchema: 0, ratio: 1 };

  const blocks = body
    .split(/\n(?=###\s+(?:GET|POST|PUT|DELETE|PATCH)\s+)/i)
    .filter((b) => /^###\s+/.test(b.trim()));
  const withSchema = blocks.filter((b) => /```json/i.test(b)).length;
  const endpointsWithSchema =
    blocks.length >= headings.length ? withSchema : Math.min(withSchema, headings.length);
  return {
    totalEndpoints: headings.length,
    endpointsWithSchema,
    ratio: headings.length > 0 ? endpointsWithSchema / headings.length : 1,
  };
}

/** Ratio de mutaciones (POST/PATCH/DELETE/PUT) con ### + JSON documentado. */
function computeMutationJsonRatio(section4) {
  const body = section4 ?? "";
  const mutationMethods = new Set(["POST", "PATCH", "DELETE", "PUT"]);

  const tableMutations = [...(body.matchAll(/^\|\s*(POST|PATCH|DELETE|PUT)\s*\|/gim))].map((m) =>
    m[1].toUpperCase(),
  );
  const mutationHeadings = extractEndpointHeadings(body).filter((h) =>
    mutationMethods.has(h.method),
  );

  const mutationBlocks = body
    .split(/\n(?=###\s+(?:POST|PATCH|DELETE|PUT)\s+)/i)
    .filter((b) => /^###\s+(?:POST|PATCH|DELETE|PUT)/i.test(b.trim()));

  const total = Math.max(tableMutations.length, mutationHeadings.length, mutationBlocks.length);
  if (total === 0) return { total: 0, withJson: 0, ratio: 1 };

  const withJson = mutationBlocks.filter((b) => /```json/i.test(b)).length;
  const effectiveWithJson =
    mutationBlocks.length >= total ? withJson : Math.min(withJson, mutationHeadings.length);

  return {
    total,
    withJson: effectiveWithJson,
    ratio: effectiveWithJson / total,
  };
}

function hasTechnicalMetadata(section3) {
  const body = section3 ?? "";
  if (/```TechnicalMetadata/i.test(body)) return true;
  if (/TechnicalMetadata/i.test(body) && /\[(?:high_security|pii|audit|retention)/i.test(body)) {
    return true;
  }
  return false;
}

function hasErDiagram(section3) {
  const body = section3 ?? "";
  const mermaidBlocks = body.match(/```mermaid[\s\S]*?```/gi) ?? [];
  return mermaidBlocks.some((block) => /erDiagram/i.test(block));
}

function minEndpointRows(decisionCount) {
  if (decisionCount >= 50) return 40;
  if (decisionCount >= 25) return 25;
  if (decisionCount >= 10) return 15;
  return Math.max(5, Math.ceil(decisionCount * 0.5));
}

function countSubsections(section5) {
  return (section5 ?? "").match(/^###\s+/gm)?.length ?? 0;
}

function countSubstantiveBullets(section5) {
  return (section5 ?? "")
    .split("\n")
    .filter((line) => /^[-*]\s+\S/.test(line.trim()) && line.trim().length > 12).length;
}

function countGherkinBlocks(section5) {
  const body = section5 ?? "";
  const fences = body.match(/```gherkin[\s\S]*?```/gi)?.length ?? 0;
  const features = body.match(/^Feature:/gim)?.length ?? 0;
  return Math.max(fences, features);
}

function minGherkinRequired(businessRuleCount) {
  if (businessRuleCount <= 0) return 2;
  if (businessRuleCount <= 4) return businessRuleCount * 2;
  return Math.min(businessRuleCount, 8);
}

function minSubsectionsRequired(businessRuleCount) {
  if (businessRuleCount <= 0) return 4;
  return Math.min(4, businessRuleCount);
}

function hasInfraManifest(section7) {
  const body = section7 ?? "";
  const jsonBlocks = body.match(/```json[\s\S]*?```/gi) ?? [];
  for (const block of jsonBlocks) {
    if (
      /"(stack|deployment|security|integration_metadata)"/i.test(block) ||
      /"base_image"/i.test(block)
    ) {
      return true;
    }
  }
  return /```json/i.test(body) && /"stack"/i.test(body);
}

function extractMddDecisionIds(markdown) {
  return [...new Set((markdown ?? "").match(/\bD-\d+\b/g) ?? [])].sort();
}

/** Infiere agente de reparación según blockers enterprise. */
export function inferFixTargetFromBlockers(blockers) {
  const text = blockers.join("\n").toLowerCase();
  if (/§4|contratos|endpoint|json|mutaci/i.test(text)) return "api_contracts";
  if (/§3|technicalmetadata|erdiagram|create table|modelo de datos/i.test(text)) return "data_model";
  if (/§5|gherkin|regla de negocio|rn-|br-/i.test(text)) return "section5";
  if (/§7|manifest|infraestructura/i.test(text)) return "integration";
  if (/§6|seguridad/i.test(text)) return "security";
  return null;
}

function evaluateMddDepth({ mdd, catalog }) {
  const trimmed = (mdd ?? "").trim();
  const blockers = [];
  const warnings = [];
  let score = 100;

  const enterprise = {
    depth: "enterprise",
    contratos_substantial: false,
    contratos_schema_ratio: null,
    mutation_json_ratio: null,
    section3_technical_metadata: false,
    section3_er_diagram: false,
    section3_canonical_entities: { total: 0, present: 0, missing: [] },
    section5_gherkin_required: 2,
    section5_gherkin_actual: 0,
    section5_subsections_required: 4,
    section5_business_rules: { total: 0, present: 0, missing: [] },
    total_lines: 0,
    min_lines_warn: 800,
    min_lines_blocker: null,
  };

  const structure = validateMddStructure(trimmed);
  if (structure.missingSections.length > 0) {
    blockers.push(`Secciones obligatorias faltantes: ${structure.missingSections.join(", ")}`);
  }

  for (const entry of CANONICAL_SECTIONS) {
    const body = extractSectionBody(trimmed, entry.num);
    const minLength = entry.num === 3 ? MIN_SECTION3_BODY : MIN_SECTION_BODY;

    if (body == null) continue;
    if (hasCrossReference(body)) continue;

    const bodyLen = body.length;
    const section3HasSql = entry.num === 3 && /CREATE\s+TABLE/i.test(body);
    const effectiveMin = entry.num === 3 && section3HasSql ? MIN_SECTION3_BODY : minLength;

    if (bodyLen < effectiveMin || isPipelinePlaceholder(body)) {
      const reason = isPipelinePlaceholder(body)
        ? `Sección ${entry.title} es placeholder o contenido insuficiente (${bodyLen} chars; mínimo ${effectiveMin}).`
        : `Sección ${entry.title} tiene contenido insuficiente (${bodyLen} chars; mínimo ${effectiveMin}).`;
      blockers.push(reason);
      continue;
    }

    if (entry.num === 4 && !isContratosSubstantial(body)) {
      blockers.push(
        "§4 Contratos de API requiere tabla resumen Y bloques JSON request/response (enterprise). Placeholder o solo stubs.",
      );
    }
  }

  const decisionCount = (catalog?.decisions ?? []).length;
  const businessRules = catalog?.businessRules ?? [];
  const businessRuleCount = businessRules.length;
  const canonicalEntities = catalog?.canonicalEntities ?? [];

  const section3 = extractSectionBody(trimmed, 3) ?? extractSection(trimmed, 3);
  const section4 = extractSectionBody(trimmed, 4) ?? extractSection(trimmed, 4);
  const section5 = extractSectionBody(trimmed, 5) ?? extractSection(trimmed, 5);
  const section7 = extractSectionBody(trimmed, 7) ?? extractSection(trimmed, 7);

  enterprise.contratos_substantial = isContratosSubstantial(section4);

  // §4 — endpoints count + schema ratio + mutation ratio
  const endpointRows = countContratosEndpointRows(section4);
  const minEndpoints = minEndpointRows(decisionCount);
  if (enterprise.contratos_substantial && endpointRows < minEndpoints) {
    blockers.push(
      `§4: ${endpointRows} filas/endpoints documentados; mínimo ${minEndpoints} para catálogo con ${decisionCount} decisiones.`,
    );
  }

  const schemaRatio = computeContratosSchemaRatio(section4);
  enterprise.contratos_schema_ratio = schemaRatio.ratio;
  if (
    schemaRatio.totalEndpoints >= CONTRATOS_SCHEMA_RATIO_MIN_ENDPOINTS &&
    schemaRatio.ratio < CONTRATOS_SCHEMA_RATIO_MIN
  ) {
    const pct = Math.round(schemaRatio.ratio * 100);
    blockers.push(
      `§4 Contratos de API: solo ${schemaRatio.endpointsWithSchema}/${schemaRatio.totalEndpoints} endpoints (${pct}%) traen request/response JSON; mínimo ${Math.round(CONTRATOS_SCHEMA_RATIO_MIN * 100)}%.`,
    );
  }

  const mutationRatio = computeMutationJsonRatio(section4);
  enterprise.mutation_json_ratio = mutationRatio.ratio;
  if (mutationRatio.total >= 3 && mutationRatio.ratio < MUTATION_JSON_RATIO_MIN) {
    const pct = Math.round(mutationRatio.ratio * 100);
    blockers.push(
      `§4 mutaciones (POST/PATCH/DELETE/PUT): solo ${mutationRatio.withJson}/${mutationRatio.total} (${pct}%) con ### METHOD /path + JSON; mínimo ${Math.round(MUTATION_JSON_RATIO_MIN * 100)}%.`,
    );
  }

  // §3 — TechnicalMetadata, erDiagram, CREATE TABLE por entidad canónica
  enterprise.section3_technical_metadata = hasTechnicalMetadata(section3);
  if (!enterprise.section3_technical_metadata) {
    blockers.push(
      "§3: falta bloque TechnicalMetadata (fence ```TechnicalMetadata o sección por tabla con etiquetas [high_security], [pii], etc.).",
    );
  }

  enterprise.section3_er_diagram = hasErDiagram(section3);
  if (!enterprise.section3_er_diagram) {
    blockers.push("§3: falta diagrama ```mermaid con erDiagram alineado a CREATE TABLE.");
  }

  enterprise.section3_canonical_entities.total = canonicalEntities.length;
  const missingEntities = [];
  for (const entity of canonicalEntities) {
    const name = typeof entity === "string" ? entity : entity?.name ?? entity?.table ?? "";
    if (!name) continue;
    if (hasCreateTable(section3, name)) {
      enterprise.section3_canonical_entities.present += 1;
    } else {
      missingEntities.push(name);
    }
  }
  enterprise.section3_canonical_entities.missing = missingEntities;
  if (missingEntities.length > 0) {
    blockers.push(
      `§3: faltan CREATE TABLE para entidades canónicas (${missingEntities.length}/${canonicalEntities.length}): ${missingEntities.slice(0, 8).join(", ")}${missingEntities.length > 8 ? "…" : ""}.`,
    );
  }

  // §5 — Gherkin, subsecciones, businessRules
  const subsections = countSubsections(section5);
  const bullets = countSubstantiveBullets(section5);
  const gherkin = countGherkinBlocks(section5);
  const minGherkin = minGherkinRequired(businessRuleCount);
  const minSubsections = minSubsectionsRequired(businessRuleCount);

  enterprise.section5_gherkin_required = minGherkin;
  enterprise.section5_gherkin_actual = gherkin;
  enterprise.section5_subsections_required = minSubsections;

  if (subsections < minSubsections && bullets < 8) {
    blockers.push(
      `§5: insuficiente profundidad (${subsections} subsecciones ###, mínimo ${minSubsections}; ${bullets} viñetas).`,
    );
  }
  if (gherkin < minGherkin) {
    blockers.push(`§5: faltan escenarios Gherkin (${gherkin}/${minGherkin} mínimo enterprise).`);
  }

  enterprise.section5_business_rules.total = businessRuleCount;
  const missingRules = [];
  for (const rule of businessRules) {
    const ruleId = rule?.id ?? rule;
    if (!ruleId) continue;
    if (hasBusinessRule(section5, ruleId)) {
      enterprise.section5_business_rules.present += 1;
    } else {
      missingRules.push(ruleId);
    }
  }
  enterprise.section5_business_rules.missing = missingRules;
  if (missingRules.length > 0) {
    blockers.push(
      `§5: faltan reglas de negocio del catálogo (${missingRules.length}/${businessRuleCount}): ${missingRules.slice(0, 10).join(", ")}${missingRules.length > 10 ? "…" : ""}.`,
    );
  }

  if (!hasInfraManifest(section7)) {
    blockers.push("§7: falta bloque JSON manifest (stack, deployment, security o integration_metadata).");
  }

  // Líneas totales — WARN escalado; blocker en catálogos grandes
  const totalLines = trimmed.split("\n").length;
  const minLinesWarn = Math.max(800, decisionCount * 15);
  enterprise.total_lines = totalLines;
  enterprise.min_lines_warn = minLinesWarn;
  if (decisionCount >= 40) {
    enterprise.min_lines_blocker = 1200;
    if (totalLines < 1200) {
      blockers.push(
        `MDD demasiado corto para catálogo enterprise (${totalLines} líneas; mínimo 1200 con ${decisionCount} decisiones).`,
      );
    }
  } else if (totalLines < minLinesWarn) {
    warnings.push(
      `MDD por debajo del objetivo enterprise (${totalLines} líneas; objetivo ≥ ${minLinesWarn} para ${decisionCount} decisiones).`,
    );
    score -= 3;
  }

  const catalogIds = new Set(listCatalogDecisionIds(catalog));
  const mddIds = extractMddDecisionIds(trimmed);
  const foreignIds = mddIds.filter((id) => !catalogIds.has(id));
  if (foreignIds.length > 0) {
    blockers.push(
      `D-IDs extranjeros al catálogo Paso 0 (${foreignIds.length}): ${foreignIds.slice(0, 12).join(", ")}${foreignIds.length > 12 ? "…" : ""}`,
    );
  }

  score -= blockers.length * BLOCKER_PENALTY;
  score = Math.max(0, Math.min(100, score));

  const ok = score >= DELIVERY_SCORE_THRESHOLD && blockers.length === 0;
  const fix_target = ok ? null : inferFixTargetFromBlockers(blockers);

  return {
    ok,
    score,
    threshold: DELIVERY_SCORE_THRESHOLD,
    blockers,
    warnings,
    fix_target,
    enterprise,
    stats: {
      decision_count: decisionCount,
      section_lengths: Object.fromEntries(
        CANONICAL_SECTIONS.map((s) => [s.num, (extractSectionBody(trimmed, s.num) ?? "").length]),
      ),
      endpoint_rows: endpointRows,
      min_endpoint_rows: minEndpoints,
      section5_subsections: subsections,
      section5_bullets: bullets,
      section5_gherkin_blocks: gherkin,
      section5_gherkin_min: minGherkin,
      section5_business_rules_present: enterprise.section5_business_rules.present,
      section5_business_rules_total: businessRuleCount,
      mdd_d_ids: mddIds.length,
      catalog_d_ids: catalogIds.size,
      foreign_d_ids: foreignIds,
      total_lines: totalLines,
    },
  };
}

const opts = parseArgs(process.argv);

if (!existsSync(opts.mdd)) {
  console.error(`MDD no encontrado: ${opts.mdd}`);
  process.exit(1);
}

const catalog = loadCatalog(opts.catalog);
const mdd = loadMdd(opts.mdd);
const report = {
  passed: false,
  generatedAt: new Date().toISOString(),
  depth: "enterprise",
  sources: { mdd: opts.mdd, catalog: opts.catalog },
  ...evaluateMddDepth({ mdd, catalog }),
};
report.passed = report.ok;

mkdirSync(dirname(opts.report), { recursive: true });
writeFileSync(opts.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (!opts.jsonOnly) {
  console.log(
    [
      `MDD depth gate (enterprise): ${report.ok ? "PASSED" : "FAILED"} (score ${report.score}/${DELIVERY_SCORE_THRESHOLD})`,
      `  Endpoints §4: ${report.stats.endpoint_rows} (mín ${report.stats.min_endpoint_rows})`,
      `  Schema ratio: ${report.enterprise.contratos_schema_ratio != null ? Math.round(report.enterprise.contratos_schema_ratio * 100) : "—"}% | Mutaciones JSON: ${report.enterprise.mutation_json_ratio != null ? Math.round(report.enterprise.mutation_json_ratio * 100) : "—"}%`,
      `  §3: TechnicalMetadata=${report.enterprise.section3_technical_metadata} erDiagram=${report.enterprise.section3_er_diagram} entities=${report.enterprise.section3_canonical_entities.present}/${report.enterprise.section3_canonical_entities.total}`,
      `  §5: ${report.stats.section5_subsections} ###, ${report.stats.section5_gherkin_blocks}/${report.stats.section5_gherkin_min} gherkin, BR ${report.stats.section5_business_rules_present}/${report.stats.section5_business_rules_total}`,
      `  Líneas: ${report.stats.total_lines} (warn ≥ ${report.enterprise.min_lines_warn}${report.enterprise.min_lines_blocker ? `, blocker ≥ ${report.enterprise.min_lines_blocker}` : ""})`,
      `  D-IDs MDD: ${report.stats.mdd_d_ids} (catálogo: ${report.stats.catalog_d_ids}, extranjeros: ${report.stats.foreign_d_ids.length})`,
      report.fix_target ? `  fix_target sugerido: ${report.fix_target}` : "",
      `  Blockers: ${report.blockers.length}`,
      `  Informe: ${opts.report}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  if (report.blockers.length > 0) {
    console.log("\nBlockers:");
    for (const b of report.blockers.slice(0, 15)) console.log(`  - ${b}`);
  }
  if (report.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of report.warnings.slice(0, 8)) console.log(`  - ${w}`);
  }
} else {
  console.log(JSON.stringify(report, null, 2));
}

process.exit(report.ok ? 0 : 1);
