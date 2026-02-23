import request from "supertest";
import app from "../src/app";
import { clearStore } from "../src/services/configService";
import { clearAuditLogs } from "../src/services/auditService";

beforeEach(() => {
  clearStore();
  clearAuditLogs();
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Versioned configs", () => {
  it("creates a config and assigns version 1", async () => {
    const res = await request(app)
      .post("/configs/feature-flag")
      .send({ value: true, environment: "production", actor: "alice" });

    expect(res.status).toBe(201);
    expect(res.body.version).toBe(1);
    expect(res.body.value).toBe(true);
    expect(res.body.environment).toBe("production");
  });

  it("increments version on each update", async () => {
    await request(app)
      .post("/configs/timeout")
      .send({ value: 30, environment: "production" });

    const res = await request(app)
      .post("/configs/timeout")
      .send({ value: 60, environment: "production" });

    expect(res.body.version).toBe(2);
    expect(res.body.value).toBe(60);
  });

  it("retrieves latest version by default", async () => {
    await request(app)
      .post("/configs/timeout")
      .send({ value: 30, environment: "production" });
    await request(app)
      .post("/configs/timeout")
      .send({ value: 60, environment: "production" });

    const res = await request(app)
      .get("/configs/timeout")
      .query({ env: "production" });

    expect(res.status).toBe(200);
    expect(res.body.version).toBe(2);
    expect(res.body.value).toBe(60);
  });

  it("retrieves a specific version", async () => {
    await request(app)
      .post("/configs/timeout")
      .send({ value: 30, environment: "production" });
    await request(app)
      .post("/configs/timeout")
      .send({ value: 60, environment: "production" });

    const res = await request(app)
      .get("/configs/timeout")
      .query({ env: "production", version: "1" });

    expect(res.status).toBe(200);
    expect(res.body.version).toBe(1);
    expect(res.body.value).toBe(30);
  });

  it("lists all versions via /configs/:key/versions", async () => {
    await request(app)
      .post("/configs/timeout")
      .send({ value: 30, environment: "production" });
    await request(app)
      .post("/configs/timeout")
      .send({ value: 60, environment: "production" });

    const res = await request(app).get("/configs/timeout/versions");
    expect(res.body.versions).toHaveLength(2);
  });

  it("returns 404 for unknown config key", async () => {
    const res = await request(app).get("/configs/nonexistent");
    expect(res.status).toBe(404);
  });

  it("returns 400 when value is missing", async () => {
    const res = await request(app)
      .post("/configs/feature-flag")
      .send({ environment: "production" });
    expect(res.status).toBe(400);
  });

  it("lists all config keys", async () => {
    await request(app)
      .post("/configs/key-a")
      .send({ value: 1 });
    await request(app)
      .post("/configs/key-b")
      .send({ value: 2 });

    const res = await request(app).get("/configs");
    expect(res.body.keys).toContain("key-a");
    expect(res.body.keys).toContain("key-b");
  });
});

describe("Environment targeting", () => {
  it("stores configs per environment independently", async () => {
    await request(app)
      .post("/configs/log-level")
      .send({ value: "debug", environment: "development" });

    await request(app)
      .post("/configs/log-level")
      .send({ value: "error", environment: "production" });

    const dev = await request(app)
      .get("/configs/log-level")
      .query({ env: "development" });
    const prod = await request(app)
      .get("/configs/log-level")
      .query({ env: "production" });

    expect(dev.body.value).toBe("debug");
    expect(prod.body.value).toBe("error");
  });

  it("versions are independent per environment", async () => {
    await request(app)
      .post("/configs/log-level")
      .send({ value: "info", environment: "staging" });
    await request(app)
      .post("/configs/log-level")
      .send({ value: "debug", environment: "staging" });
    await request(app)
      .post("/configs/log-level")
      .send({ value: "error", environment: "production" });

    const staging = await request(app)
      .get("/configs/log-level")
      .query({ env: "staging" });
    const prod = await request(app)
      .get("/configs/log-level")
      .query({ env: "production" });

    expect(staging.body.version).toBe(2);
    expect(prod.body.version).toBe(1);
  });

  it("filters versions by environment", async () => {
    await request(app)
      .post("/configs/feature-x")
      .send({ value: true, environment: "staging" });
    await request(app)
      .post("/configs/feature-x")
      .send({ value: false, environment: "production" });

    const res = await request(app)
      .get("/configs/feature-x/versions")
      .query({ env: "staging" });
    expect(res.body.versions).toHaveLength(1);
    expect(res.body.versions[0].environment).toBe("staging");
  });

  it("returns 404 for a key that exists in another env but not the requested one", async () => {
    await request(app)
      .post("/configs/only-in-prod")
      .send({ value: true, environment: "production" });

    const res = await request(app)
      .get("/configs/only-in-prod")
      .query({ env: "development" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /configs/:key", () => {
  it("deletes config for a specific environment", async () => {
    await request(app)
      .post("/configs/flag")
      .send({ value: true, environment: "production" });

    const del = await request(app)
      .delete("/configs/flag")
      .query({ env: "production" });
    expect(del.body.deleted).toBe(true);

    const get = await request(app)
      .get("/configs/flag")
      .query({ env: "production" });
    expect(get.status).toBe(404);
  });

  it("returns 404 when deleting non-existent config", async () => {
    const res = await request(app)
      .delete("/configs/missing")
      .query({ env: "production" });
    expect(res.status).toBe(404);
  });
});
