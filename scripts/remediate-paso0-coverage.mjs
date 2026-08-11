#!/usr/bin/env node
/**
 * Post-proceso determinista Paso 0 → MDD: validate → patch → re-validate (loop).
 * Salida: deliverables/paso0-remediation-log.json
 */
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PATHS,
  loadCatalog,
  loadMdd,
  validatePaso0MddCoverage,
  termPresentInText,
  normalizeTerm,
  hasApiPath,
  extractSection,
  stripSectionsForCoverageScan,
  listRequiredDecisionIds,
  hasDecisionId,
  injectSection0,
  appendSection10,
} from "./paso0-coverage-lib.mjs";
import { inferFixTargetFromBlockers } from "./validate-mdd-depth.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = join(__dirname, "..");

const MARKERS = {
  glossary: "<!-- paso0-glossary-remediation -->",
  risks: "<!-- paso0-risks-remediation -->",
  api: "<!-- paso0-api-remediation -->",
  decisions: "<!-- paso0-decisions-remediation -->",
};

const DEFAULT_LOG = join(workspaceRoot, "deliverables/paso0-remediation-log.json");

function parseArgs(argv) {
  const opts = {
    catalog: DEFAULT_PATHS.catalog,
    mdd: DEFAULT_PATHS.mdd,
    report: DEFAULT_PATHS.report,
    log: DEFAULT_LOG,
    maxIterations: 3,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--catalog" && argv[i + 1]) opts.catalog = argv[++i];
    else if (arg === "--mdd" && argv[i + 1]) opts.mdd = argv[++i];
    else if (arg === "--report" && argv[i + 1]) opts.report = argv[++i];
    else if (arg === "--log" && argv[i + 1]) opts.log = argv[++i];
    else if (arg === "--max-iterations" && argv[i + 1]) {
      opts.maxIterations = Math.max(1, parseInt(argv[++i], 10) || 3);
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Uso: node scripts/remediate-paso0-coverage.mjs",
          "  [--catalog PATH] [--mdd PATH] [--report PATH] [--log PATH]",
          "  [--max-iterations N]",
        ].join("\n"),
      );
      process.exit(0);
    }
  }
  return opts;
}

function buildEnterpriseDepthHints(report) {
  const hints = [];
  const missing = report.missingBySection ?? {};
  if ((missing.section4_apiRouteFamilies ?? []).length > 0) {
    hints.push(
      "§4: ejecutar /forge-api-contracts — cada mutación con ### METHOD /path + JSON request/response + 4xx (ratio ≥60%).",
    );
  }
  if ((missing.section5_businessRules ?? []).length > 0) {
    hints.push(
      "§5: ejecutar /forge-section5 — bloque ```gherkin por cada businessRules[] (RN-xx/BR-xxx + D-IDs).",
    );
  }
  if ((missing.section3_canonicalEntities ?? []).length > 0) {
    hints.push(
      "§3: ejecutar /forge-data-model — CREATE TABLE + TechnicalMetadata + erDiagram por entidad canónica faltante.",
    );
  }
  return hints;
}

function tryEnterpriseDepthHints(opts, log) {
  try {
    const out = execSync(
      `node "${join(__dirname, "validate-mdd-depth.mjs")}" --json-only --mdd "${opts.mdd}" --catalog "${opts.catalog}"`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    const depth = JSON.parse(out);
    if (!depth.ok && depth.blockers?.length) {
      log.enterprise_depth_hints = depth.blockers.slice(0, 8).map((b) => ({
        blocker: b,
        fix_target: inferFixTargetFromBlockers([b]),
      }));
    }
  } catch {
    // validate:mdd-depth falló — ignorar en remediation Paso 0
  }
}

function findEntity(catalog, term) {
  const normalized = normalizeTerm(term);
  return (catalog.entities ?? []).find((e) => normalizeTerm(e.term) === normalized);
}

function findRisk(catalog, riskId) {
  return (catalog.risks ?? []).find((r) => r.id === riskId);
}

function formatDecisionIds(ids) {
  if (!ids?.length) return "—";
  return ids.join(", ");
}

function buildGlossaryRows(catalog, missingTerms) {
  return missingTerms.map((term) => {
    const entity = findEntity(catalog, term);
    const definition =
      entity?.definition ??
      `Término del dominio definido en el catálogo Paso 0 (${normalizeTerm(term)}).`;
    const ids = formatDecisionIds(entity?.decisionIds);
    return `| ${normalizeTerm(term)} | ${definition} | ${ids} |`;
  });
}

function buildRiskRows(catalog, missingRiskIds) {
  return missingRiskIds.map((riskId) => {
    const risk = findRisk(catalog, riskId);
    const name = risk?.name ?? "Riesgo del catálogo Paso 0";
    const mitigation = risk?.mitigation ?? "—";
    const ids = formatDecisionIds(risk?.decisionIds);
    return `| ${riskId} | ${name} | ${mitigation} | ${ids} |`;
  });
}

function upsertTableBlock(markdown, marker, heading, tableHeader, newRows) {
  if (newRows.length === 0) return { markdown, added: 0 };

  const block = [
    heading,
    "",
    marker,
    "",
    tableHeader,
    ...newRows,
    "",
  ].join("\n");

  if (markdown.includes(marker)) {
    const existingRows = new Set();
    const markerIdx = markdown.indexOf(marker);
    const afterMarker = markdown.slice(markerIdx);
    const tableEnd = afterMarker.search(/\n\n(?=###|##|<!--|$)/);
    const tableSection = tableEnd >= 0 ? afterMarker.slice(0, tableEnd) : afterMarker;
    for (const line of tableSection.split("\n")) {
      if (line.startsWith("|") && !line.includes("---")) {
        const term = line.split("|")[1]?.trim();
        if (term) existingRows.add(term);
      }
    }
    const rowsToAdd = newRows.filter((row) => {
      const term = row.split("|")[1]?.trim();
      return term && !existingRows.has(term);
    });
    if (rowsToAdd.length === 0) return { markdown, added: 0 };
    const insertAt = markerIdx + tableSection.length;
    return {
      markdown: `${markdown.slice(0, insertAt)}\n${rowsToAdd.join("\n")}${markdown.slice(insertAt)}`,
      added: rowsToAdd.length,
    };
  }

  return { markdown: `${markdown}\n${block}`, added: newRows.length, block };
}

function patchGlossary(mdd, catalog, missingTerms) {
  const termsStillMissing = missingTerms.filter((t) => !termPresentInText(extractSection(mdd, 1), t));
  if (termsStillMissing.length === 0) return { mdd, patches: [] };

  const rows = buildGlossaryRows(catalog, termsStillMissing);
  const heading = "#### Glosario complementario (catálogo Paso 0)";
  const tableHeader = "| Término | Definición | D-IDs |\n|---|---|---|";

  if (mdd.includes(MARKERS.glossary)) {
    const result = upsertTableBlock(mdd, MARKERS.glossary, "", tableHeader, rows);
    return {
      mdd: result.markdown,
      patches: result.added
        ? [{ category: "glossary", action: "append_rows", count: result.added, terms: termsStillMissing }]
        : [],
    };
  }

  const block = [
    heading,
    "",
    "Términos vinculantes del catálogo Paso 0 materializados en §1 para trazabilidad y validación automática.",
    "",
    MARKERS.glossary,
    "",
    tableHeader,
    ...rows,
    "",
  ].join("\n");

  const anchor = "### 1.6 Actores";
  if (mdd.includes(anchor)) {
    return {
      mdd: mdd.replace(anchor, `${block}${anchor}`),
      patches: [{ category: "glossary", action: "insert_block", count: rows.length, terms: termsStillMissing }],
    };
  }

  const section1End = /^##\s+2\./m.exec(mdd);
  if (section1End) {
    const idx = section1End.index;
    return {
      mdd: `${mdd.slice(0, idx)}${block}\n${mdd.slice(idx)}`,
      patches: [{ category: "glossary", action: "insert_before_section2", count: rows.length, terms: termsStillMissing }],
    };
  }

  return { mdd, patches: [] };
}

function patchRisks(mdd, catalog, missingRiskIds) {
  if (missingRiskIds.length === 0) return { mdd, patches: [] };

  const rows = buildRiskRows(catalog, missingRiskIds);
  const tableHeader = "| ID | Riesgo | Mitigación | D-IDs |\n|---|---|---|---|";

  if (mdd.includes(MARKERS.risks)) {
    const result = upsertTableBlock(mdd, MARKERS.risks, "", tableHeader, rows);
    return {
      mdd: result.markdown,
      patches: result.added
        ? [{ category: "risks", action: "append_rows", count: result.added, ids: missingRiskIds }]
        : [],
    };
  }

  const block = [
    "### 1.7 Riesgos y mitigaciones (catálogo Paso 0)",
    "",
    "Registro vinculante de riesgos identificados en el Paso 0. Cada **R-xxx** debe permanecer",
    "trazable en diseño, pruebas y operación; las mitigaciones «Genérica» se concretan en",
    "controles de §3–§7 y reglas RN-xx.",
    "",
    MARKERS.risks,
    "",
    tableHeader,
    ...rows,
    "",
  ].join("\n");

  const anchor = "## 2. Arquitectura";
  if (mdd.includes(anchor)) {
    return {
      mdd: mdd.replace(anchor, `${block}${anchor}`),
      patches: [{ category: "risks", action: "insert_section_1_7", count: rows.length, ids: missingRiskIds }],
    };
  }

  return { mdd, patches: [] };
}

function buildMcpDetailBlock(family) {
  const ids = formatDecisionIds(family.decisionIds);
  return [
    "",
    "### 4.4 Transporte MCP — `/mcp`",
    "",
    MARKERS.api,
    "",
    `Endpoint de transporte **JSON-RPC** para agentes externos registrados (${ids}).`,
    "Complementa la gestión REST en `/agents` y las invocaciones por tema en",
    "`/topics/{id}/agent-invocations`. Requiere doble autorización: credencial de agente",
    "habilitada y membresía contextual/tema válida (D-103, D-106).",
    "",
    "**POST /mcp** — Invocación de herramienta:",
    "",
    "```json",
    "{",
    '  "jsonrpc": "2.0",',
    '  "id": "550e8400-e29b-41d4-a716-446655440000",',
    '  "method": "tools/call",',
    '  "params": {',
    '    "name": "read_topic_summary",',
    '    "arguments": {',
    '      "topicId": "uuid",',
    '      "maxMessages": 50',
    "    }",
    "  }",
    "}",
    "```",
    "",
    "**Respuesta exitosa:**",
    "",
    "```json",
    "{",
    '  "jsonrpc": "2.0",',
    '  "id": "550e8400-e29b-41d4-a716-446655440000",',
    '  "result": {',
    '    "content": [{ "type": "text", "text": "Resumen de cronología autorizada." }],',
    '    "isError": false',
    "  }",
    "}",
    "```",
    "",
    "**GET /mcp** — Descubrimiento de capacidades (SSE o long-poll según cliente MCP).",
    "",
  ].join("\n");
}

function patchApiFamilies(mdd, catalog, missingFamilies) {
  if (missingFamilies.length === 0) return { mdd, patches: [] };

  let patched = mdd;
  const patches = [];

  for (const family of missingFamilies) {
    for (const pathPattern of family.missingPaths ?? []) {
      if (hasApiPath(extractSection(patched, 4) || patched, pathPattern)) continue;

      const ids = formatDecisionIds(family.decisionIds);
      const tableRows = [];

      if (pathPattern === "/mcp") {
        tableRows.push(
          `| POST | \`/mcp\` | Transporte JSON-RPC MCP (invocación de herramientas) | credencial agente + doble autorización | ${ids} |`,
          `| GET | \`/mcp\` | Descubrimiento de capacidades MCP | credencial agente habilitada | ${ids} |`,
        );
      } else {
        const methods = (family.methods ?? ["GET"]).join(", ");
        tableRows.push(
          `| ${methods.split(",")[0].trim()} | \`${pathPattern}\` | ${family.label ?? family.id} (remediación Paso 0) | según familia | ${ids} |`,
        );
      }

      const agentSection = "| **Agente MCP** ||||";
      if (pathPattern === "/mcp" && patched.includes(agentSection)) {
        const idx = patched.indexOf(agentSection);
        const nextSection = patched.indexOf("| **Cifrado** ||||", idx);
        const insertAt = nextSection > idx ? nextSection : patched.indexOf("\n| **", idx + 1);
        if (insertAt > idx) {
          patched = `${patched.slice(0, insertAt)}${tableRows.join("\n")}\n${patched.slice(insertAt)}`;
          patches.push({ category: "api", action: "append_table_rows", pathPattern, familyId: family.id });
        }
      } else {
        const summaryAnchor = "### 4.2 Resumen de endpoints";
        if (patched.includes(summaryAnchor)) {
          const section4End = /^##\s+5\./m.exec(patched);
          const insertAt = section4End ? section4End.index : patched.length;
          const rows = [
            "",
            `**Familia ${family.id}** (remediación Paso 0) ||||`,
            ...tableRows,
            "",
          ].join("\n");
          patched = `${patched.slice(0, insertAt)}${rows}${patched.slice(insertAt)}`;
          patches.push({ category: "api", action: "append_family_block", pathPattern, familyId: family.id });
        }
      }

      if (pathPattern === "/mcp" && !patched.includes(MARKERS.api)) {
        const section5Anchor = "## 5. Lógica";
        if (patched.includes(section5Anchor)) {
          patched = patched.replace(section5Anchor, `${buildMcpDetailBlock(family)}${section5Anchor}`);
          patches.push({ category: "api", action: "insert_mcp_contract", pathPattern, familyId: family.id });
        }
      }
    }
  }

  const totalRe = /\*\*Total: (\d+) endpoints\.\*\*/;
  const addedRows = patches.filter((p) => p.category === "api").length;
  if (addedRows > 0 && totalRe.test(patched)) {
    patched = patched.replace(totalRe, (_, n) => `**Total: ${parseInt(n, 10) + (addedRows > 1 ? 2 : 1)} endpoints.**`);
  }

  return { mdd: patched, patches };
}

function patchMissingDecisionIds(mdd, catalog) {
  const corpus = stripSectionsForCoverageScan(mdd);
  const requiredIds = listRequiredDecisionIds(catalog);
  const missing = requiredIds.filter((id) => !hasDecisionId(corpus, id));
  if (missing.length === 0) return { mdd, patches: [] };

  const rows = missing.map((id) => {
    const decision = (catalog.decisions ?? []).find((d) => d.id === id);
    const rule = (decision?.rule ?? "Decisión del catálogo Paso 0").replace(/\|/g, "\\|");
    return `| ${id} | ${rule} |`;
  });

  const tableHeader = "| D-ID | Regla (catálogo Paso 0) |\n|---|---|";

  if (mdd.includes(MARKERS.decisions)) {
    const result = upsertTableBlock(mdd, MARKERS.decisions, "", tableHeader, rows);
    return {
      mdd: result.markdown,
      patches: result.added
        ? [{ category: "decisions", action: "append_rows", count: result.added, ids: missing }]
        : [],
    };
  }

  const block = [
    "### 1.8 Referencias complementarias de decisiones (catálogo Paso 0)",
    "",
    "Decisiones MVP o confirmadas materializadas explícitamente para trazabilidad automática.",
    "",
    MARKERS.decisions,
    "",
    tableHeader,
    ...rows,
    "",
  ].join("\n");

  const anchor = "## 2. Arquitectura";
  if (mdd.includes(anchor)) {
    return {
      mdd: mdd.replace(anchor, `${block}${anchor}`),
      patches: [{ category: "decisions", action: "insert_section_1_8", count: rows.length, ids: missing }],
    };
  }

  const section1End = /^##\s+2\./m.exec(mdd);
  if (section1End) {
    const idx = section1End.index;
    return {
      mdd: `${mdd.slice(0, idx)}${block}\n${mdd.slice(idx)}`,
      patches: [{ category: "decisions", action: "insert_before_section2", count: rows.length, ids: missing }],
    };
  }

  return { mdd, patches: [] };
}

function ensureSupplementalSections(mdd, catalog) {
  const patches = [];
  let patched = mdd;
  const before0 = patched;
  patched = injectSection0(patched, catalog);
  if (patched !== before0) {
    patches.push({ category: "section0", action: "inject_patterns", count: 1 });
  }
  const before10 = patched;
  patched = appendSection10(patched, {
    version: "2.0-local",
    change:
      "Integración §0 patrones inmutables; remediación cobertura Paso 0 y §9 sincronizado con validador.",
  });
  if (patched !== before10) {
    patches.push({ category: "section10", action: "append_changelog", count: 1 });
  }
  return { mdd: patched, patches };
}

function regenerateSection9(mdd, mddPath) {
  const section10Match = mdd.match(/\n##\s+10\.?\s+Registro de cambios[\s\S]*$/i);
  const section10 = section10Match ? section10Match[0].trimEnd() : "";
  const withoutS9S10 = mdd
    .replace(/\n##\s+9\.?\s+Trazabilidad[\s\S]*?(?=\n##\s+10\.|\s*$)/i, "")
    .replace(/\n##\s+10\.?\s+Registro de cambios[\s\S]*$/i, "")
    .trimEnd();
  const tempRel = "docs/sdd/mdd-temp-section9.md";
  const tempPath = join(workspaceRoot, tempRel);
  writeFileSync(tempPath, `${withoutS9S10}\n`, "utf8");
  const section9 = execSync(`node scripts/generate-paso0-section9.mjs --mdd ${tempRel}`, {
    cwd: workspaceRoot,
    encoding: "utf8",
  }).trim();
  try {
    unlinkSync(tempPath);
  } catch {
    /* ignore */
  }
  const merged = section10 ? `${withoutS9S10}\n\n${section9}\n\n${section10}\n` : `${withoutS9S10}\n\n${section9}\n`;
  return {
    mdd: merged,
    patches: [{ category: "section9", action: "regenerate_from_catalog", count: 1 }],
  };
}

function applyDeterministicPatches(mdd, catalog, report, mddPath) {
  let patched = mdd;
  const allPatches = [];

  const supplementalResult = ensureSupplementalSections(patched, catalog);
  patched = supplementalResult.mdd;
  allPatches.push(...supplementalResult.patches);

  const glossaryResult = patchGlossary(patched, catalog, report.missingBySection.section1_glossary ?? []);
  patched = glossaryResult.mdd;
  allPatches.push(...glossaryResult.patches);

  const risksResult = patchRisks(patched, catalog, report.missingBySection.risks ?? []);
  patched = risksResult.mdd;
  allPatches.push(...risksResult.patches);

  const apiResult = patchApiFamilies(patched, catalog, report.missingBySection.section4_apiRouteFamilies ?? []);
  patched = apiResult.mdd;
  allPatches.push(...apiResult.patches);

  const decisionsResult = patchMissingDecisionIds(patched, catalog);
  patched = decisionsResult.mdd;
  allPatches.push(...decisionsResult.patches);

  const section9Result = regenerateSection9(patched, mddPath);
  patched = section9Result.mdd;
  allPatches.push(...section9Result.patches);

  return { mdd: patched, patches: allPatches };
}

function finalizeMdd(mdd, catalog, mddPath) {
  let patched = mdd;
  const allPatches = [];

  const supplementalResult = ensureSupplementalSections(patched, catalog);
  patched = supplementalResult.mdd;
  allPatches.push(...supplementalResult.patches);

  const decisionsResult = patchMissingDecisionIds(patched, catalog);
  patched = decisionsResult.mdd;
  allPatches.push(...decisionsResult.patches);

  const section9Result = regenerateSection9(patched, mddPath);
  patched = section9Result.mdd;
  allPatches.push(...section9Result.patches);

  return { mdd: patched, patches: allPatches };
}

function writeReport(report, reportPath) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function main() {
  const opts = parseArgs(process.argv);
  const log = {
    startedAt: new Date().toISOString(),
    sources: { catalog: opts.catalog, mdd: opts.mdd, report: opts.report },
    maxIterations: opts.maxIterations,
    iterations: [],
    passed: false,
    blockersBefore: null,
    blockersAfter: null,
  };

  for (let i = 0; i < opts.maxIterations; i++) {
    const catalog = loadCatalog(opts.catalog);
    let mdd = loadMdd(opts.mdd);
    const beforeReport = validatePaso0MddCoverage({ catalog, mdd });

    if (i === 0) log.blockersBefore = beforeReport.stats.blockers_count;

    if (beforeReport.passed) {
      const { mdd: finalized, patches } = finalizeMdd(mdd, catalog, opts.mdd);
      if (patches.length > 0) {
        writeFileSync(opts.mdd, finalized, "utf8");
        mdd = finalized;
      }
      const afterReport = validatePaso0MddCoverage({ catalog, mdd });
      afterReport.sources = { catalog: opts.catalog, mdd: opts.mdd };
      writeReport(afterReport, opts.report);
      log.passed = afterReport.passed;
      log.blockersAfter = afterReport.stats.blockers_count;
      log.iterations.push({
        iteration: i + 1,
        blockersBefore: beforeReport.stats.blockers_count,
        blockersAfter: afterReport.stats.blockers_count,
        patches,
        note: "already_passed_finalize_sections",
      });
      break;
    }

    const { mdd: patched, patches } = applyDeterministicPatches(mdd, catalog, beforeReport, opts.mdd);
    if (patches.length > 0) {
      writeFileSync(opts.mdd, patched, "utf8");
      mdd = patched;
    }

    const afterReport = validatePaso0MddCoverage({ catalog, mdd });
    afterReport.sources = { catalog: opts.catalog, mdd: opts.mdd };
    writeReport(afterReport, opts.report);

    log.iterations.push({
      iteration: i + 1,
      blockersBefore: beforeReport.stats.blockers_count,
      blockersAfter: afterReport.stats.blockers_count,
      patches,
      remainingBlockers: afterReport.blockers,
    });

    log.blockersAfter = afterReport.stats.blockers_count;

    if (afterReport.passed) {
      log.passed = true;
      break;
    }

    if (patches.length === 0) {
      log.stoppedReason = "no_deterministic_patches_applied";
      break;
    }
  }

  log.finishedAt = new Date().toISOString();

  const lastReport = validatePaso0MddCoverage({
    catalog: loadCatalog(opts.catalog),
    mdd: loadMdd(opts.mdd),
  });
  log.enterprise_coverage_hints = buildEnterpriseDepthHints(lastReport);
  tryEnterpriseDepthHints(opts, log);

  mkdirSync(dirname(opts.log), { recursive: true });
  writeFileSync(opts.log, `${JSON.stringify(log, null, 2)}\n`, "utf8");

  console.log(
    [
      `Paso 0 remediation: ${log.passed ? "PASSED" : "FAILED"}`,
      `  Iteraciones: ${log.iterations.length}/${opts.maxIterations}`,
      `  Blockers: ${log.blockersBefore ?? "?"} → ${log.blockersAfter ?? "?"}`,
      `  Log: ${opts.log}`,
      `  Informe: ${opts.report}`,
    ].join("\n"),
  );

  if (!log.passed) {
    const last = log.iterations[log.iterations.length - 1];
    if (last?.remainingBlockers?.length) {
      console.log("\nBlockers restantes:");
      for (const b of last.remainingBlockers.slice(0, 15)) console.log(`  - ${b}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
