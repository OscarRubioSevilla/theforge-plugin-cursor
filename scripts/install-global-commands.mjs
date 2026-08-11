#!/usr/bin/env node
/**
 * Symlink plugin commands/*.md into ~/.cursor/commands/ so they appear in the
 * chat slash menu. Local/marketplace plugins do not reliably expose commands/
 * (Cursor bug); global commands always work.
 *
 * Usage: npm run install:commands
 */
import { readdirSync, mkdirSync, lstatSync, symlinkSync, unlinkSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { resolvePluginRoot } from "./forge-plugin-path.mjs";

const pluginRoot = resolvePluginRoot();
const commandsDir = join(pluginRoot, "commands");
const globalCommandsDir = join(homedir(), ".cursor", "commands");

mkdirSync(globalCommandsDir, { recursive: true });

const files = readdirSync(commandsDir).filter((f) => f.endsWith(".md"));
let linked = 0;

for (const file of files) {
  const source = join(commandsDir, file);
  const target = join(globalCommandsDir, file);

  try {
    const stat = lstatSync(target);
    if (stat.isSymbolicLink()) {
      unlinkSync(target);
    } else if (stat.isFile()) {
      console.warn(`skip ${file}: ${target} exists and is not a symlink`);
      continue;
    }
  } catch {
    // target does not exist
  }

  symlinkSync(source, target);
  linked += 1;
  console.log(`linked ${target} -> ${source}`);
}

console.log(`\nDone: ${linked} command(s) in ${globalCommandsDir}`);
console.log("Reload Cursor: Cmd+Shift+P → Developer: Reload Window");
