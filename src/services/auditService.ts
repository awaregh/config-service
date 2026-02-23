import { AuditEntry } from "../types";
import { randomUUID } from "crypto";

const entries: AuditEntry[] = [];

export function logAudit(
  action: AuditEntry["action"],
  key: string,
  environment: string,
  version: number | null,
  actor: string,
  before: unknown,
  after: unknown
): AuditEntry {
  const entry: AuditEntry = {
    id: randomUUID(),
    action,
    key,
    environment,
    version,
    actor,
    timestamp: new Date().toISOString(),
    diff: { before, after },
  };
  entries.push(entry);
  return entry;
}

export function getAuditLogs(key?: string): AuditEntry[] {
  if (key) {
    return entries.filter((e) => e.key === key);
  }
  return [...entries];
}

export function clearAuditLogs(): void {
  entries.length = 0;
}
