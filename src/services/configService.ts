import { Config, ConfigVersion } from "../types";
import { logAudit } from "./auditService";
import { broadcast } from "./reloadService";

const store = new Map<string, Config>();

export function getConfig(
  key: string,
  environment: string = "production",
  version?: number
): ConfigVersion | undefined {
  const config = store.get(key);
  if (!config) return undefined;

  const envVersions = config.versions.filter(
    (v) => v.environment === environment
  );
  if (envVersions.length === 0) return undefined;

  if (version !== undefined) {
    return envVersions.find((v) => v.version === version);
  }
  // Return highest version
  return envVersions.reduce((a, b) => (a.version > b.version ? a : b));
}

export function getAllVersions(
  key: string,
  environment?: string
): ConfigVersion[] {
  const config = store.get(key);
  if (!config) return [];
  if (environment) {
    return config.versions.filter((v) => v.environment === environment);
  }
  return [...config.versions];
}

export function setConfig(
  key: string,
  value: unknown,
  environment: string = "production",
  actor: string = "system"
): ConfigVersion {
  let config = store.get(key);
  if (!config) {
    config = { key, versions: [] };
    store.set(key, config);
  }

  const envVersions = config.versions.filter(
    (v) => v.environment === environment
  );
  const latestVersion =
    envVersions.length > 0
      ? Math.max(...envVersions.map((v) => v.version))
      : 0;

  const prev =
    envVersions.length > 0
      ? envVersions.find((v) => v.version === latestVersion)?.value
      : undefined;

  const newVersion: ConfigVersion = {
    version: latestVersion + 1,
    value,
    environment,
    createdAt: new Date().toISOString(),
    createdBy: actor,
  };

  config.versions.push(newVersion);

  const action = latestVersion === 0 ? "created" : "updated";
  logAudit(action, key, environment, newVersion.version, actor, prev, value);
  broadcast({ key, environment, version: newVersion.version });

  return newVersion;
}

export function deleteConfig(
  key: string,
  environment?: string,
  actor: string = "system"
): boolean {
  const config = store.get(key);
  if (!config) return false;

  if (environment) {
    const before = config.versions.filter((v) => v.environment === environment);
    if (before.length === 0) return false;
    config.versions = config.versions.filter(
      (v) => v.environment !== environment
    );
    logAudit("deleted", key, environment, null, actor, before, null);
    if (config.versions.length === 0) store.delete(key);
  } else {
    logAudit("deleted", key, "*", null, actor, config.versions, null);
    store.delete(key);
  }
  return true;
}

export function listConfigs(): string[] {
  return Array.from(store.keys());
}

export function clearStore(): void {
  store.clear();
}
