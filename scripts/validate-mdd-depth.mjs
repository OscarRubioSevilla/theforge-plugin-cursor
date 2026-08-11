#!/usr/bin/env node
/**
 * Delivery gate local — profundidad y calidad del MDD (paridad con mdd-delivery-gate.util.ts).
 * Salida: deliverables/mdd-depth-report.json (+ resumen en stdout)
 * Exit 1 si score < 90 o hay blockers.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractSection,
  listCatalogDecisionIds,
  loadCatalog,
  loadMdd,
} from "./paso0-coverage-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DELIVERY_SCORE_THRESHOLD = 90;
const MIN_SECTION_BODY = 200;
const MIN_SECTION3_BODY = 100;
const BLOCKER_PENALTY = 8;

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
          "Valida profundidad §1–§7, endpoints §4, §5 BDD, manifest §7 y D-IDs extranjeros.",
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

function isContratosSubstantial(section4) {
  const body = section4 ?? "";
  if (body.length < 80) return false;
  if (/Falta:\s*definir endpoints/i.test(body)) return false;
  const hasRoute = /\/[a-z0-9_{}-]+/i.test(body);
  const hasJson = /```json/i.test(body);
  const hasTable = /^\| (GET|POST|PATCH|DELETE|PUT) \|/m.test(body);
  return hasRoute && (hasJson || hasTable);
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

function countBusinessRules(section5) {
  return new Set((section5 ?? "").match(/\bRN-\d{2,3}\b/g) ?? []).size;
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

function evaluateMddDepth({ mdd, catalog }) {
  const trimmed = (mdd ?? "").trim();
  const blockers = [];
  const warnings = [];
  let score = 100;

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
        "§4 Contratos de API no tiene endpoints reales con request/response JSON (placeholder o solo stubs).",
      );
    }
  }

  const decisionCount = (catalog?.decisions ?? []).length;
  const section4 = extractSectionBody(trimmed, 4) ?? extractSection(trimmed, 4);
  const endpointRows = countContratosEndpointRows(section4);
  const minEndpoints = minEndpointRows(decisionCount);
  if (isContratosSubstantial(section4) && endpointRows < minEndpoints) {
    blockers.push(
      `§4: ${endpointRows} filas/endpoints documentados; mínimo ${minEndpoints} para catálogo con ${decisionCount} decisiones.`,
    );
  }

  const section5 = extractSectionBody(trimmed, 5) ?? extractSection(trimmed, 5);
  const subsections = countSubsections(section5);
  const bullets = countSubstantiveBullets(section5);
  const gherkin = countGherkinBlocks(section5);
  const rnCount = countBusinessRules(section5);

  if (subsections < 4 && bullets < 8) {
    blockers.push(
      `§5: insuficiente profundidad (${subsections} subsecciones ###, ${bullets} viñetas; mínimo 4 ### o 8 viñetas).`,
    );
  }
  if (gherkin < 2) {
    blockers.push(`§5: faltan escenarios Gherkin (${gherkin}/2 mínimo).`);
  }
  if ((catalog?.businessRules ?? []).length > 0 && rnCount < Math.min(4, catalog.businessRules.length)) {
    warnings.push(
      `§5: solo ${rnCount} reglas RN-XX detectadas; catálogo declara ${catalog.businessRules.length} businessRules.`,
    );
    score -= 5;
  }

  const section7 = extractSectionBody(trimmed, 7) ?? extractSection(trimmed, 7);
  if (!hasInfraManifest(section7)) {
    blockers.push("§7: falta bloque JSON manifest (stack, deployment, security o integration_metadata).");
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

  return {
    ok,
    score,
    threshold: DELIVERY_SCORE_THRESHOLD,
    blockers,
    warnings,
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
      section5_rn_count: rnCount,
      mdd_d_ids: mddIds.length,
      catalog_d_ids: catalogIds.size,
      foreign_d_ids: foreignIds,
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
  sources: { mdd: opts.mdd, catalog: opts.catalog },
  ...evaluateMddDepth({ mdd, catalog }),
};
report.passed = report.ok;

mkdirSync(dirname(opts.report), { recursive: true });
writeFileSync(opts.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (!opts.jsonOnly) {
  console.log(
    [
      `MDD depth gate: ${report.ok ? "PASSED" : "FAILED"} (score ${report.score}/${DELIVERY_SCORE_THRESHOLD})`,
      `  Endpoints §4: ${report.stats.endpoint_rows} (mín ${report.stats.min_endpoint_rows})`,
      `  §5: ${report.stats.section5_subsections} ###, ${report.stats.section5_gherkin_blocks} gherkin, ${report.stats.section5_rn_count} RN-xx`,
      `  D-IDs MDD: ${report.stats.mdd_d_ids} (catálogo: ${report.stats.catalog_d_ids}, extranjeros: ${report.stats.foreign_d_ids.length})`,
      `  Blockers: ${report.blockers.length}`,
      `  Informe: ${opts.report}`,
    ].join("\n"),
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
