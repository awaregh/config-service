import { Router, Request, Response } from "express";
import { getAuditLogs } from "../services/auditService";

const router = Router();

// Get all audit logs
router.get("/", (_req: Request, res: Response) => {
  const logs = getAuditLogs();
  res.json({ logs });
});

// Get audit logs for a specific config key
router.get("/:key", (req: Request, res: Response) => {
  const key = req.params.key as string;
  const logs = getAuditLogs(key);
  res.json({ key, logs });
});

export default router;
