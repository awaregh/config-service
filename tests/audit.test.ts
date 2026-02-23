import request from "supertest";
import app from "../src/app";
import { clearStore } from "../src/services/configService";
import { clearAuditLogs } from "../src/services/auditService";

beforeEach(() => {
  clearStore();
  clearAuditLogs();
});

describe("Audit logs", () => {
  it("logs a created entry when a config is first created", async () => {
    await request(app)
      .post("/configs/my-flag")
      .send({ value: true, environment: "production", actor: "alice" });

    const res = await request(app).get("/audit/my-flag");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);

    const entry = res.body.logs[0];
    expect(entry.action).toBe("created");
    expect(entry.key).toBe("my-flag");
    expect(entry.environment).toBe("production");
    expect(entry.actor).toBe("alice");
    expect(entry.version).toBe(1);
    expect(entry.diff.before).toBeUndefined();
    expect(entry.diff.after).toBe(true);
  });

  it("logs an updated entry on subsequent writes", async () => {
    await request(app)
      .post("/configs/timeout")
      .send({ value: 30, environment: "production", actor: "alice" });
    await request(app)
      .post("/configs/timeout")
      .send({ value: 60, environment: "production", actor: "bob" });

    const res = await request(app).get("/audit/timeout");
    expect(res.body.logs).toHaveLength(2);

    const [first, second] = res.body.logs;
    expect(first.action).toBe("created");
    expect(second.action).toBe("updated");
    expect(second.actor).toBe("bob");
    expect(second.diff.before).toBe(30);
    expect(second.diff.after).toBe(60);
  });

  it("logs a deleted entry on DELETE", async () => {
    await request(app)
      .post("/configs/temp")
      .send({ value: "x", environment: "production", actor: "alice" });

    await request(app)
      .delete("/configs/temp")
      .query({ env: "production", actor: "carol" });

    const res = await request(app).get("/audit/temp");
    expect(res.body.logs).toHaveLength(2);

    const last = res.body.logs[1];
    expect(last.action).toBe("deleted");
    expect(last.actor).toBe("carol");
  });

  it("GET /audit returns all logs across all keys", async () => {
    await request(app)
      .post("/configs/key-a")
      .send({ value: 1, environment: "production" });
    await request(app)
      .post("/configs/key-b")
      .send({ value: 2, environment: "staging" });

    const res = await request(app).get("/audit");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(2);
  });

  it("audit entries have a timestamp and unique id", async () => {
    await request(app)
      .post("/configs/something")
      .send({ value: "v", environment: "production" });

    const res = await request(app).get("/audit/something");
    const entry = res.body.logs[0];
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
