import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CONFIG_DIR = path.join(process.cwd(), ".data");
const CONFIG_PATH = path.join(CONFIG_DIR, "runtime-config.json");

/**
 * Setup Wizard fields, mapped to the env vars they hydrate. Values entered
 * in the wizard are written here (gitignored, local to this deployment)
 * and applied to `process.env` on load — every agent already reads
 * `process.env` directly, so nothing else needs to change to pick these up.
 */
export const CONFIG_FIELD_ENV_MAP = {
  shopifyStoreDomain: "SHOPIFY_STORE_DOMAIN",
  shopifyAdminAccessToken: "SHOPIFY_ADMIN_ACCESS_TOKEN",
  shopifyWebhookSecret: "SHOPIFY_WEBHOOK_SECRET",
  domainName: "DOMAIN_NAME",
  openaiApiKey: "OPENAI_API_KEY",
  anthropicApiKey: "ANTHROPIC_API_KEY",
  googleAiApiKey: "GOOGLE_AI_API_KEY",
  ollamaBaseUrl: "OLLAMA_BASE_URL",
  qdrantUrl: "QDRANT_URL",
  qdrantApiKey: "QDRANT_API_KEY",
} as const;

export type ConfigField = keyof typeof CONFIG_FIELD_ENV_MAP;
export type RuntimeConfig = Partial<Record<ConfigField, string>>;

async function readConfigFile(): Promise<RuntimeConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as RuntimeConfig;
  } catch {
    return {};
  }
}

function applyToEnv(config: RuntimeConfig): void {
  for (const [field, envVar] of Object.entries(CONFIG_FIELD_ENV_MAP) as Array<[ConfigField, string]>) {
    const value = config[field];
    if (value) process.env[envVar] = value;
  }
}

/** Loads any previously-saved wizard config and hydrates process.env. Call once at orchestrator startup. */
export async function loadRuntimeConfig(): Promise<void> {
  const config = await readConfigFile();
  applyToEnv(config);
}

/** Merges new values into the saved config, persists to disk, and applies immediately (no restart needed). */
export async function saveRuntimeConfig(partial: RuntimeConfig): Promise<void> {
  const existing = await readConfigFile();
  const merged = { ...existing, ...partial };
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf8");
  applyToEnv(merged);
}

/** Connection status per field, for the Setup Wizard and API Keys page — never returns the actual secret values. */
export function getConfigStatus(): Record<ConfigField, boolean> {
  const status = {} as Record<ConfigField, boolean>;
  for (const [field, envVar] of Object.entries(CONFIG_FIELD_ENV_MAP) as Array<[ConfigField, string]>) {
    status[field] = Boolean(process.env[envVar]);
  }
  return status;
}
