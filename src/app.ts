import express from "express";
import configsRouter from "./routes/configs";
import auditRouter from "./routes/audit";
import reloadRouter from "./routes/reload";

const app = express();
app.use(express.json());

app.use("/configs", configsRouter);
app.use("/audit", auditRouter);
app.use("/reload", reloadRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
