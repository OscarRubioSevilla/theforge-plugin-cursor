#!/usr/bin/env node
/**
 * Sincroniza prompts MDD desde apps/api hacia prompts/mdd/ del plugin.
 * Ejecutar desde packages/cursor-sdd-workspace: node scripts/vendor-prompts.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, "..");
const MONOREPO_ROOT = join(PACKAGE_ROOT, "../..");
const SOURCE_DIR = join(
  MONOREPO_ROOT,
  "apps/api/src/modules/ai-analysis/prompts/mdd",
);
const DEST_DIR = join(PACKAGE_ROOT, "prompts/mdd");

function copyMdRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      count += copyMdRecursive(srcPath, destPath);
    } else if (entry.endsWith(".md")) {
      cpSync(srcPath, destPath);
      count += 1;
    }
  }
  return count;
}

function main() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`Error: no existe el directorio fuente: ${SOURCE_DIR}`);
    console.error("Ejecuta este script desde el monorepo The Forge.");
    process.exit(1);
  }

  const count = copyMdRecursive(SOURCE_DIR, DEST_DIR);
  console.log(`✓ ${count} archivos .md copiados a prompts/mdd/`);
}

main();
