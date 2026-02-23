export interface ConfigVersion {
  version: number;
  value: unknown;
  environment: string;
  createdAt: string;
  createdBy: string;
}

export interface Config {
  key: string;
  versions: ConfigVersion[];
}

export interface AuditEntry {
  id: string;
  action: "created" | "updated" | "deleted";
  key: string;
  environment: string;
  version: number | null;
  actor: string;
  timestamp: string;
  diff: { before: unknown; after: unknown };
}

export interface ReloadEvent {
  key: string;
  environment: string;
  version: number;
}
