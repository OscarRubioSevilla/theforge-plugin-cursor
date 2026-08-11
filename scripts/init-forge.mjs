#!/usr/bin/env node
/**
 * Scaffold Cursor-native SDD workspace (WORKFLOW.yaml SSOT).
 *
 * Uso:
 *   node scripts/init-forge.mjs --name "My App" --idea "Description" [opciones]
 *
 * Opciones:
 *   --target PATH           Directorio destino (default: cwd)
 *   --monorepo-subdir PATH  Crea bajo el monorepo The Forge (ej. packages/my-app-sdd)
 *   --name TEXT             Nombre del producto (requerido)
 *   --idea TEXT             Descripción de la idea (requerido)
 *   --slug TEXT             ID kebab-case (default: derivado de --name)
 *   --mode MODE             high_split | monolithic (default: high_split)
 *   --force                 Sobrescribir si WORKFLOW.yaml ya existe
 *   --no-cursor             Solo artefactos del proyecto (sin copiar .cursor/)
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, "..");
const MONOREPO_ROOT = join(PACKAGE_ROOT, "../..");
const TEMPLATES_DIR = join(PACKAGE_ROOT, "templates");
const SOURCE_CURSOR = join(PACKAGE_ROOT, ".cursor");
const REPO_CURSOR = join(MONOREPO_ROOT, ".cursor");

function parseArgs(argv) {
  const opts = {
    target: process.cwd(),
    monorepoSubdir: null,
    name: null,
    idea: null,
    slug: null,
    mode: "high_split",
    force: false,
    noCursor: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--target" && argv[i + 1]) opts.target = resolve(argv[++i]);
    else if (arg === "--monorepo-subdir" && argv[i + 1]) opts.monorepoSubdir = argv[++i];
    else if (arg === "--name" && argv[i + 1]) opts.name = argv[++i];
    else if (arg === "--idea" && argv[i + 1]) opts.idea = argv[++i];
    else if (arg === "--slug" && argv[i + 1]) opts.slug = argv[++i];
    else if (arg === "--mode" && argv[i + 1]) opts.mode = argv[++i];
    else if (arg === "--force") opts.force = true;
    else if (arg === "--no-cursor") opts.noCursor = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Argumento desconocido: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  if (opts.monorepoSubdir) {
    opts.target = resolve(MONOREPO_ROOT, opts.monorepoSubdir);
    opts.isMonorepoSubdir = true;
    opts.monorepoPrefix = opts.monorepoSubdir.replace(/\\/g, "/");
  } else {
    opts.isMonorepoSubdir = false;
    opts.monorepoPrefix = null;
  }

  return opts;
}

function printHelp() {
  console.log(`Uso: node scripts/init-forge.mjs --name "My App" --idea "Description" [opciones]

Opciones:
  --target PATH           Directorio destino (default: cwd)
  --monorepo-subdir PATH  Crea bajo el monorepo The Forge
  --name TEXT             Nombre del producto (requerido)
  --idea TEXT             Descripción de la idea (requerido)
  --slug TEXT             ID kebab-case (default: derivado de --name)
  --mode MODE             high_split | monolithic (default: high_split)
  --force                 Sobrescribir si WORKFLOW.yaml ya existe
  --no-cursor             Solo artefactos (plugin Forge SDD ya instalado)
`);
}

function slugFromName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "forge-project";
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(dirname(dest));
  cpSync(src, dest);
}

function copyDirRecursive(src, dest) {
  cpSync(src, dest, { recursive: true });
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function writeText(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content, "utf8");
}

function substituteWorkflow(template, { id, name, idea, mode }) {
  const ideaBlock = idea.split("\n").join("\n    ");

  return template
    .replace(/\{\{project\.id\}\}/g, id)
    .replace(/\{\{project\.name\}\}/g, name)
    .replace(/\{\{project\.idea\}\}/g, ideaBlock)
    .replace(/\{\{pipeline\.mode\}\}/g, mode);
}

function adjustConstitution(content, { standalone, monorepoPrefix }) {
  let globs;
  let scopeNote;

  if (standalone) {
    globs = 'docs/sdd/**, paso0/**, WORKFLOW.yaml, deliverables/**';
    scopeNote = "Aplica al editar artefactos SDD en la raíz de este workspace.";
  } else {
    const p = monorepoPrefix.replace(/\\/g, "/");
    globs = `${p}/docs/sdd/**, ${p}/paso0/**, ${p}/WORKFLOW.yaml, ${p}/deliverables/**`;
    scopeNote = `Aplica al editar archivos bajo \`${p}/\`.`;
  }

  let updated = content.replace(
    /^globs:.*$/m,
    `globs: ${globs}`,
  );

  if (updated.includes("Aplica al editar archivos bajo")) {
    updated = updated.replace(
      /Aplica al editar archivos bajo `[^`]+`\./,
      scopeNote,
    );
  } else if (updated.includes("Aplica al editar artefactos SDD")) {
    updated = updated.replace(
      /Aplica al editar artefactos SDD en la raíz de este workspace\./,
      scopeNote,
    );
  } else {
    updated = updated.replace(
      "# Forge SDD — constitución local\n",
      `# Forge SDD — constitución local\n\n${scopeNote}\n`,
    );
  }

  updated = updated.replace(
    /Ejecutar `npm run validate:paso0-coverage` \(desde `packages\/cursor-sdd-workspace\/`\)\./,
    "Ejecutar `npm run validate:paso0-coverage` (desde la raíz del workspace SDD).",
  );

  return updated;
}

function prefixCommandPaths(content, prefix) {
  if (!prefix) return content;
  const p = `${prefix.replace(/\\/g, "/").replace(/\/$/, "")}/`;

  let result = content.replaceAll("packages/cursor-sdd-workspace/", p);

  const tokens = ["WORKFLOW.yaml", "paso0/", "docs/sdd/", "deliverables/"];
  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<!${p.replace(/\//g, "\\/")})\\b${escaped}`, "g");
    result = result.replace(re, `${p}${token}`);
  }
  return result.replaceAll(`${p}${p}`, p);
}

function adjustForgeWorkflowSkill(content, { standalone, monorepoPrefix }) {
  if (standalone) {
    return content
      .replace(
        /Orquesta el flujo SDD local en packages\/cursor-sdd-workspace \(Paso 0 → Spec →/,
        "Orquesta el flujo SDD local en este workspace (Paso 0 → Spec →",
      )
      .replace(
        /Flujo \*\*archivos como SSOT\*\* en `packages\/cursor-sdd-workspace\/`\. No llamar a The Forge API, MCP TheForge ni jobs LangGraph\./,
        "Flujo **archivos como SSOT** en la raíz del workspace. No llamar a The Forge API, MCP TheForge ni jobs LangGraph.",
      )
      .replace(/\| Estado \| `packages\/cursor-sdd-workspace\/WORKFLOW\.yaml` \|/g, "| Estado | `WORKFLOW.yaml` |")
      .replace(/\| Pipeline sidecars \| `packages\/cursor-sdd-workspace\/docs\/sdd\/\.pipeline\/` \|/g, "| Pipeline sidecars | `docs/sdd/.pipeline/` |")
      .replace(/\| Paso 0 benchmark \| `packages\/cursor-sdd-workspace\/paso0\/domain-benchmark\.md` \|/g, "| Paso 0 benchmark | `paso0/domain-benchmark.md` |")
      .replace(/\| Catálogo D-ID \| `packages\/cursor-sdd-workspace\/paso0\/decisions\.catalog\.json` \|/g, "| Catálogo D-ID | `paso0/decisions.catalog.json` |")
      .replace(/\| Spec \| `packages\/cursor-sdd-workspace\/docs\/sdd\/spec\.md` \|/g, "| Spec | `docs/sdd/spec.md` |")
      .replace(/\| MDD \| `packages\/cursor-sdd-workspace\/docs\/sdd\/mdd\.md` \|/g, "| MDD | `docs/sdd/mdd.md` |")
      .replace(/Script: `packages\/cursor-sdd-workspace\/scripts\/validate-paso0-mdd-coverage\.mjs`/g, "Script: `scripts/validate-paso0-mdd-coverage.mjs` (si está instalado)")
      .replace(/```bash\ncd packages\/cursor-sdd-workspace\nnpm run validate:paso0-coverage/g, "```bash\nnpm run validate:paso0-coverage")
      .replace(/Plantilla §8–§10: `paso0\/mdd-sections-template\.md`\./g, "Plantilla §8–§10: `paso0/mdd-sections-template.md`.");
  }

  const p = monorepoPrefix.replace(/\\/g, "/");
  return content.replace(/packages\/cursor-sdd-workspace\//g, `${p}/`);
}

function listMarkdownFiles(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listMarkdownFiles(full));
    } else if (entry.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function copyMonorepoCommands(targetCursorDir, monorepoPrefix) {
  const monoCommands = join(REPO_CURSOR, "commands");
  const destCommands = join(targetCursorDir, "commands");
  ensureDir(destCommands);

  if (existsSync(monoCommands)) {
    copyDirRecursive(monoCommands, destCommands);
    for (const file of listMarkdownFiles(destCommands)) {
      if (file.endsWith("init-forge.md")) continue;
      const original = readText(file);
      writeText(file, prefixCommandPaths(original, monorepoPrefix));
    }
    return "monorepo-root";
  }

  copyDirRecursive(join(SOURCE_CURSOR, "commands"), destCommands);
  for (const file of listMarkdownFiles(destCommands)) {
    if (file.endsWith("init-forge.md")) continue;
    const original = readText(file);
    writeText(file, prefixCommandPaths(original, monorepoPrefix));
  }
  return "portable-prefixed";
}

function main() {
  const opts = parseArgs(process.argv);

  if (!opts.name || !opts.idea) {
    console.error("Error: --name y --idea son obligatorios.");
    printHelp();
    process.exit(1);
  }

  if (!["high_split", "monolithic"].includes(opts.mode)) {
    console.error("Error: --mode debe ser high_split o monolithic.");
    process.exit(1);
  }

  const slug = opts.slug ?? slugFromName(opts.name);
  const target = opts.target;
  const workflowPath = join(target, "WORKFLOW.yaml");

  if (existsSync(workflowPath) && !opts.force) {
    console.error(`Error: ${workflowPath} ya existe. Usa --force para sobrescribir.`);
    process.exit(1);
  }

  console.log(`Scaffolding SDD workspace en: ${target}`);

  ensureDir(target);

  const workflowTemplate = readText(join(TEMPLATES_DIR, "WORKFLOW.template.yaml"));
  writeText(
    workflowPath,
    substituteWorkflow(workflowTemplate, {
      id: slug,
      name: opts.name,
      idea: opts.idea,
      mode: opts.mode,
    }),
  );

  ensureDir(join(target, "paso0"));
  copyFile(join(PACKAGE_ROOT, "paso0/TEMPLATE.md"), join(target, "paso0/TEMPLATE.md"));
  copyFile(
    join(PACKAGE_ROOT, "paso0/mdd-sections-template.md"),
    join(target, "paso0/mdd-sections-template.md"),
  );

  const benchmark = readText(join(PACKAGE_ROOT, "paso0/TEMPLATE.md")).replace(
    /\{Nombre del producto\}/g,
    opts.name,
  );
  writeText(join(target, "paso0/domain-benchmark.md"), benchmark);

  copyFile(
    join(TEMPLATES_DIR, "decisions.catalog.empty.json"),
    join(target, "paso0/decisions.catalog.json"),
  );

  ensureDir(join(target, "docs/sdd/.pipeline"));
  copyFile(join(TEMPLATES_DIR, "spec.stub.md"), join(target, "docs/sdd/spec.md"));
  copyFile(join(TEMPLATES_DIR, "mdd.stub.md"), join(target, "docs/sdd/mdd.md"));
  copyFile(join(TEMPLATES_DIR, "blueprint.stub.md"), join(target, "docs/sdd/blueprint.md"));
  copyFile(join(TEMPLATES_DIR, "tasks.stub.md"), join(target, "docs/sdd/tasks.md"));

  ensureDir(join(target, "deliverables"));
  copyFile(join(TEMPLATES_DIR, "deliverables/README.stub.md"), join(target, "deliverables/README.md"));

  copyDirRecursive(join(PACKAGE_ROOT, "ui"), join(target, "ui"));
  ensureDir(join(target, "scripts"));
  for (const script of [
    "serve-sdd-ui.mjs",
    "workflow-read.util.mjs",
    "validate-mdd-depth.mjs",
    "paso0-coverage-lib.mjs",
    "validate-paso0-mdd-coverage.mjs",
  ]) {
    copyFile(join(PACKAGE_ROOT, "scripts", script), join(target, "scripts", script));
  }

  const packageStub = readText(join(TEMPLATES_DIR, "package.stub.json")).replace(
    /\{\{slug\}\}/g,
    slug,
  );
  writeText(join(target, "package.json"), packageStub);

  if (!opts.noCursor) {
    const targetCursor = join(target, ".cursor");
    ensureDir(targetCursor);

    if (opts.isMonorepoSubdir) {
      copyMonorepoCommands(targetCursor, opts.monorepoPrefix);
      const rulesSrc = existsSync(join(REPO_CURSOR, "rules/forge-sdd-constitution.mdc"))
        ? join(REPO_CURSOR, "rules/forge-sdd-constitution.mdc")
        : join(SOURCE_CURSOR, "rules/forge-sdd-constitution.mdc");
      const constitution = adjustConstitution(readText(rulesSrc), {
        standalone: false,
        monorepoPrefix: opts.monorepoPrefix,
      });
      writeText(join(targetCursor, "rules/forge-sdd-constitution.mdc"), constitution);
    } else {
      copyDirRecursive(SOURCE_CURSOR, targetCursor);
      const constitutionPath = join(targetCursor, "rules/forge-sdd-constitution.mdc");
      if (existsSync(constitutionPath)) {
        writeText(
          constitutionPath,
          adjustConstitution(readText(constitutionPath), { standalone: true }),
        );
      }
    }

    ensureDir(join(targetCursor, "commands"));
    const initForgeCmdCandidates = [
      join(PACKAGE_ROOT, "commands/init-forge.md"),
      join(PACKAGE_ROOT, ".cursor/commands/init-forge.md"),
      join(REPO_CURSOR, "commands/init-forge.md"),
    ];
    for (const src of initForgeCmdCandidates) {
      if (existsSync(src)) {
        copyFile(src, join(targetCursor, "commands/init-forge.md"));
        break;
      }
    }

    const targetSkills = join(targetCursor, "skills");
    ensureDir(targetSkills);

    const forgeWorkflowSrc = existsSync(join(PACKAGE_ROOT, "skills/forge-workflow/SKILL.md"))
      ? join(PACKAGE_ROOT, "skills/forge-workflow/SKILL.md")
      : join(REPO_CURSOR, "skills/forge-workflow/SKILL.md");
    if (existsSync(forgeWorkflowSrc)) {
      ensureDir(join(targetSkills, "forge-workflow"));
      const skillContent = adjustForgeWorkflowSkill(readText(forgeWorkflowSrc), {
        standalone: !opts.isMonorepoSubdir,
        monorepoPrefix: opts.monorepoPrefix,
      });
      writeText(join(targetSkills, "forge-workflow/SKILL.md"), skillContent);
    }

    const initForgeSkillSrc = existsSync(join(PACKAGE_ROOT, "skills/init-forge/SKILL.md"))
      ? join(PACKAGE_ROOT, "skills/init-forge/SKILL.md")
      : join(REPO_CURSOR, "skills/init-forge/SKILL.md");
    if (existsSync(initForgeSkillSrc)) {
      ensureDir(join(targetSkills, "init-forge"));
      copyFile(initForgeSkillSrc, join(targetSkills, "init-forge/SKILL.md"));
    }
  }

  console.log("");
  console.log("✓ Scaffold SDD creado");
  console.log(`  Proyecto: ${opts.name} (${slug})`);
  console.log(`  Pipeline: ${opts.mode}`);
  console.log(`  WORKFLOW: ${workflowPath}`);
  console.log("");
  console.log("Próximo paso:");
  console.log("  1. Abre esta carpeta como workspace en Cursor (si aún no lo está).");
  console.log("  2. Instala dependencias del panel UI: npm install");
  if (opts.noCursor) {
    console.log("  3. Comandos /forge-* vienen del plugin Forge SDD instalado.");
    console.log("  4. En el chat: /forge-paso0");
    console.log("  5. (Opcional) Panel visual: npm run ui");
  } else {
    console.log("  3. En el chat: /forge-paso0");
    console.log("  4. (Opcional) Panel visual: npm run ui");
  }
  console.log("");
}

main();
