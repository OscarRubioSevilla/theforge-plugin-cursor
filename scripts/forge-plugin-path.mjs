import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PLUGIN_ROOT = join(__dirname, "..");

/** @returns {string} Root of theforge monorepo (prompts source). */
export function resolveMonorepoRoot() {
  if (process.env.MONOREPO_ROOT || process.env.FORGE_MONOREPO_ROOT) {
    return resolve(process.env.MONOREPO_ROOT ?? process.env.FORGE_MONOREPO_ROOT);
  }
  const sibling = join(PLUGIN_ROOT, "../theforge");
  if (existsSync(join(sibling, "apps/api"))) {
    return sibling;
  }
  const homeClone = join(process.env.HOME ?? "", "Documents/GitHub/theforge");
  if (existsSync(join(homeClone, "apps/api"))) {
    return homeClone;
  }
  return sibling;
}

export const MONOREPO_ROOT = resolveMonorepoRoot();

/** @returns {string} Root of theforge-plugin-cursor (publish target). */
export function resolvePluginRoot() {
  if (process.env.FORGE_PLUGIN_ROOT) {
    return resolve(process.env.FORGE_PLUGIN_ROOT);
  }
  const sibling = join(MONOREPO_ROOT, "../theforge-plugin-cursor");
  if (existsSync(join(sibling, ".cursor-plugin", "plugin.json"))) {
    return sibling;
  }
  const homeClone = join(
    process.env.HOME ?? "",
    "Documents/GitHub/theforge-plugin-cursor",
  );
  if (existsSync(join(homeClone, ".cursor-plugin", "plugin.json"))) {
    return homeClone;
  }
  return PLUGIN_ROOT;
}

export function resolvePromptsSourceDir() {
  if (process.env.FORGE_PROMPTS_SOURCE) {
    return resolve(process.env.FORGE_PROMPTS_SOURCE);
  }
  return join(
    MONOREPO_ROOT,
    "apps/api/src/modules/ai-analysis/prompts/mdd",
  );
}
