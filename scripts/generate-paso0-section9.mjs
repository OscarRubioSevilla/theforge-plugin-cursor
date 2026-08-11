#!/usr/bin/env node
/**
 * Genera markdown §9 Trazabilidad desde catálogo Paso 0 + escaneo de D-IDs en mdd.md.
 * Uso: node scripts/generate-paso0-section9.mjs [--stdout] [--mdd PATH] [--catalog PATH]
 */
import { writeFileSync } from "node:fs";
import {
  DEFAULT_PATHS,
  loadCatalog,
  loadMdd,
  listRequiredDecisionIds,
  scanDecisionIdSections,
  hasDecisionId,
  stripSectionsForCoverageScan,
  validatePaso0MddCoverage,
} from "./paso0-coverage-lib.mjs";

function parseArgs(argv) {
  const opts = {
    catalog: DEFAULT_PATHS.catalog,
    mdd: DEFAULT_PATHS.mdd,
    stdout: false,
    out: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--stdout") opts.stdout = true;
    else if (arg === "--catalog" && argv[i + 1]) opts.catalog = argv[++i];
    else if (arg === "--mdd" && argv[i + 1]) opts.mdd = argv[++i];
    else if (arg === "--out" && argv[i + 1]) opts.out = argv[++i];
  }
  return opts;
}

function buildSection9Markdown(catalog, mdd) {
  const coverageCorpus = stripSectionsForCoverageScan(mdd);
  const locate = scanDecisionIdSections(coverageCorpus);
  const requiredIds = listRequiredDecisionIds(catalog);
  const report = validatePaso0MddCoverage({ catalog, mdd });
  const { stats } = report;

  const rows = requiredIds.map((id) => {
    const sections = locate(id);
    const where = sections.length > 0 ? sections.join(", ") : "—";
    const status = hasDecisionId(coverageCorpus, id) ? "✓" : "—";
    return `| ${id} | ${where} | ${status} |`;
  });

  const capabilityRows = (catalog.mvpCapabilities ?? []).map((cap) => {
    const ids = (cap.decisionIds ?? []).join(", ");
    const covered = (cap.decisionIds ?? []).every((id) => hasDecisionId(coverageCorpus, id));
    return `| ${ids} | ${cap.title} | ${covered ? "✓" : "—"} |`;
  });

  const lines = [
    "### 9.1 Cobertura de decisiones MVP y confirmadas",
    "",
    "| D-ID | Secciones en MDD | Presente |",
    "|---|---|---|",
    ...rows,
    "",
    "### 9.2 Capacidades MVP (catálogo)",
    "",
    "| D-IDs | Capacidad | Cubierta |",
    "|---|---|---|",
    ...capabilityRows,
    "",
    "### 9.3 Resumen",
    "",
    `- Decisiones obligatorias en MDD: **${stats.mvp_decision_ids_in_mdd}/${stats.mvp_decision_ids_total}**`,
  ];

  const missing = requiredIds.filter((id) => !hasDecisionId(coverageCorpus, id));
  if (missing.length > 0) {
    const preview = missing.slice(0, 20).join(", ");
    lines.push(
      `- **Brecha:** ${missing.length} D-ID sin referencia: ${preview}${missing.length > 20 ? "…" : ""}`,
    );
  } else {
    lines.push(
      "- Cobertura completa: todas las decisiones MVP y confirmadas están referenciadas en §0–§8.",
    );
  }

  lines.push(
    "",
    "### 9.4 Exclusiones verificables",
    "",
    "Revisar que el MDD no materializa capacidades marcadas como fuera de alcance en Paso 0.",
    "",
    ...(catalog.outOfScope ?? []).slice(0, 8).map((o) => `- ${o.rule} (${(o.decisionIds ?? []).join(", ")})`),
    "",
  );

  return lines.join("\n");
}

const opts = parseArgs(process.argv);
const catalog = loadCatalog(opts.catalog);
const mdd = loadMdd(opts.mdd);
const body = buildSection9Markdown(catalog, mdd);
const full = `## 9. Trazabilidad\n\n${body}\n`;

if (opts.stdout) {
  process.stdout.write(full);
} else if (opts.out) {
  writeFileSync(opts.out, full, "utf8");
  console.log(`§9 escrito en ${opts.out}`);
} else {
  process.stdout.write(full);
}
