import { Router, Request, Response } from "express";
import { addClient } from "../services/reloadService";

const router = Router();

// SSE endpoint – clients connect here to receive live config updates
router.get("/", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send an initial connected event
  res.write(`data: ${JSON.stringify({ event: "connected" })}\n\n`);

  addClient(res);

  req.on("close", () => {
    res.end();
  });
});

export default router;
