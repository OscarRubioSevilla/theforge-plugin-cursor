#!/usr/bin/env node
/**
 * Valida cobertura Paso 0 → MDD (catálogo → secciones dedicadas).
 * Salida: deliverables/paso0-coverage-report.json
 * Exit 1 si blockers.length > 0
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  DEFAULT_PATHS,
  loadCatalog,
  loadMdd,
  validatePaso0MddCoverage,
} from "./paso0-coverage-lib.mjs";

function parseArgs(argv) {
  const opts = { catalog: DEFAULT_PATHS.catalog, mdd: DEFAULT_PATHS.mdd, report: DEFAULT_PATHS.report };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--catalog" && argv[i + 1]) opts.catalog = argv[++i];
    else if (arg === "--mdd" && argv[i + 1]) opts.mdd = argv[++i];
    else if (arg === "--report" && argv[i + 1]) opts.report = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log(`Uso: node scripts/validate-paso0-mdd-coverage.mjs [--catalog PATH] [--mdd PATH] [--report PATH]`);
      process.exit(0);
    }
  }
  return opts;
}

const opts = parseArgs(process.argv);
const catalog = loadCatalog(opts.catalog);
const mdd = loadMdd(opts.mdd);
const report = validatePaso0MddCoverage({ catalog, mdd });

report.sources = { catalog: opts.catalog, mdd: opts.mdd };

mkdirSync(dirname(opts.report), { recursive: true });
writeFileSync(opts.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");

const { stats } = report;
console.log(
  [
    `Paso 0 → MDD coverage: ${report.passed ? "PASSED" : "FAILED"}`,
    `  D-IDs MVP/confirmada: ${stats.mvp_decision_ids_in_mdd}/${stats.mvp_decision_ids_total} (${(stats.mvp_decision_ids_in_mdd_ratio * 100).toFixed(1)}%)`,
    `  Entidades §3: ${stats.canonical_entities_in_section3}/${stats.canonical_entities_total}`,
    `  Familias API §4: ${stats.mandatory_api_families_in_section4}/${stats.mandatory_api_families_total}`,
    `  Reglas RN §5: ${stats.business_rules_in_section5}/${stats.business_rules_total}`,
    `  §9 Trazabilidad: ${stats.section9_present ? "sí" : "NO"}`,
    `  §0 Patrones: ${stats.section0_present ? "sí" : "NO"}`,
    `  §10 Changelog: ${stats.section10_present ? "sí" : "NO"}`,
    `  Blockers: ${stats.blockers_count}`,
    `  Informe: ${opts.report}`,
  ].join("\n"),
);

if (!report.passed) {
  const preview = report.blockers.slice(0, 12);
  console.log("\nPrimeros blockers:");
  for (const b of preview) console.log(`  - ${b}`);
  if (report.blockers.length > preview.length) {
    console.log(`  … y ${report.blockers.length - preview.length} más`);
  }
  process.exit(1);
}

process.exit(0);
