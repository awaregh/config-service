import { Router, Request, Response } from "express";
import {
  getConfig,
  getAllVersions,
  setConfig,
  deleteConfig,
  listConfigs,
} from "../services/configService";

const router = Router();

// List all config keys
router.get("/", (_req: Request, res: Response) => {
  res.json({ keys: listConfigs() });
});

// Get latest config for key and environment
router.get("/:key", (req: Request, res: Response) => {
  const key = req.params.key as string;
  const environment = (req.query.env as string) || "production";
  const version = req.query.version
    ? parseInt(req.query.version as string, 10)
    : undefined;

  const config = getConfig(key, environment, version);
  if (!config) {
    res.status(404).json({ error: "Config not found" });
    return;
  }
  res.json({ key, ...config });
});

// Get all versions for key (optionally scoped to env)
router.get("/:key/versions", (req: Request, res: Response) => {
  const key = req.params.key as string;
  const environment = req.query.env as string | undefined;
  const versions = getAllVersions(key, environment);
  res.json({ key, versions });
});

// Create or update a config (new version)
router.post("/:key", (req: Request, res: Response) => {
  const key = req.params.key as string;
  const { value, environment = "production", actor = "anonymous" } = req.body;

  if (value === undefined) {
    res.status(400).json({ error: "value is required" });
    return;
  }

  const version = setConfig(key, value, environment, actor);
  res.status(201).json({ key, ...version });
});

// Delete config (optionally scoped to env)
router.delete("/:key", (req: Request, res: Response) => {
  const key = req.params.key as string;
  const environment = req.query.env as string | undefined;
  const actor = (req.query.actor as string) || "anonymous";

  const deleted = deleteConfig(key, environment, actor);
  if (!deleted) {
    res.status(404).json({ error: "Config not found" });
    return;
  }
  res.json({ deleted: true });
});

export default router;
