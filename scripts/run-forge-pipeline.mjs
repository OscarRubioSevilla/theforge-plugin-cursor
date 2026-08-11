#!/usr/bin/env node
/**
 * Deprecated for manual agent pipeline; do not use for project generation.
 *
 * Este script existía para generar artefactos hardcodeados de Workspace Chat.
 * El pipeline SDD oficial usa slash commands /forge-* y sidecars en docs/sdd/.pipeline/.
 *
 * Uso permitido: lectura de WORKFLOW.yaml + paso0 para diagnóstico local.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "./paso0-coverage-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function main() {
  const workflowPath = join(ROOT, "WORKFLOW.yaml");
  const catalogPath = join(ROOT, "paso0/decisions.catalog.json");

  const summary = {
    deprecated: true,
    message:
      "run-forge-pipeline.mjs está deprecado. Usa /forge-mdd-pipeline y npm run validate:mdd-depth.",
    workflow: existsSync(workflowPath),
    catalog: existsSync(catalogPath),
  };

  if (summary.catalog) {
    try {
      const catalog = loadCatalog(catalogPath);
      summary.project = {
        decisions: catalog.decisions?.length ?? 0,
        entities: catalog.entities?.length ?? 0,
        architecturePatterns: catalog.architecturePatterns?.length ?? 0,
      };
    } catch (err) {
      summary.catalogError = err.message;
    }
  }

  if (summary.workflow) {
    const wf = readFileSync(workflowPath, "utf8");
    const phase = wf.match(/^phase:\s*(.+)$/m)?.[1]?.trim();
    const current = wf.match(/current_agent:\s*(.+)$/m)?.[1]?.trim();
    summary.pipeline = { phase, current_agent: current };
  }

  console.log(JSON.stringify(summary, null, 2));
  process.exit(1);
}

main();
