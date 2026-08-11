#!/usr/bin/env node
/**
 * Aplica enforcement determinista Paso 0 al MDD local (misma lógica que API Workshop).
 * Uso: node --import tsx scripts/enforce-paso0-mdd.mjs [--catalog PATH] [--mdd PATH] [--write]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_PATHS, loadCatalog, loadMdd } from "./paso0-coverage-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../..");

function parseArgs(argv) {
  const opts = {
    catalog: DEFAULT_PATHS.catalog,
    mdd: DEFAULT_PATHS.mdd,
    write: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--catalog" && argv[i + 1]) opts.catalog = argv[++i];
    else if (arg === "--mdd" && argv[i + 1]) opts.mdd = argv[++i];
    else if (arg === "--write") opts.write = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Uso: node --import tsx scripts/enforce-paso0-mdd.mjs",
          "  [--catalog PATH] [--mdd PATH] [--write]",
        ].join("\n"),
      );
      process.exit(0);
    }
  }
  return opts;
}

const opts = parseArgs(process.argv);

if (!existsSync(opts.catalog)) {
  console.error(`Catálogo no encontrado: ${opts.catalog}`);
  process.exit(1);
}
if (!existsSync(opts.mdd)) {
  console.error(`MDD no encontrado: ${opts.mdd}`);
  process.exit(1);
}

const catalog = loadCatalog(opts.catalog);
const mddBefore = loadMdd(opts.mdd);

const { enforcePaso0CatalogOnMdd } = await import(
  join(repoRoot, "apps/api/src/modules/engine/mdd-paso0-enforcement.util.ts")
);

const result = enforcePaso0CatalogOnMdd(mddBefore, catalog);
const changed = result.markdown !== mddBefore;

console.log(
  [
    `Paso 0 MDD enforcement: ${changed ? "applied" : "no-op"}`,
    `  Catalog: ${opts.catalog}`,
    `  MDD: ${opts.mdd}`,
    `  Stripped tables: ${result.strippedTables.length}`,
    `  Missing canonical: ${result.missingCanonical.length}`,
    `  §4 routes stripped: ${result.section4StrippedRoutes.length}`,
    `  Gaps reported: ${result.gaps.length}`,
  ].join("\n"),
);

if (result.gaps.length > 0) {
  console.log("\nPrimeros gaps:");
  for (const gap of result.gaps.slice(0, 8)) console.log(`  - ${gap}`);
}

if (opts.write) {
  writeFileSync(opts.mdd, result.markdown, "utf8");
  console.log(`\nEscrito: ${resolve(opts.mdd)}`);
} else if (changed) {
  console.log("\nUsa --write para persistir los cambios en docs/sdd/mdd.md");
}

process.exit(0);
