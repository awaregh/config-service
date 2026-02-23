import http from "http";
import app from "../src/app";
import { clearStore } from "../src/services/configService";
import { clearAuditLogs } from "../src/services/auditService";
import { clientCount } from "../src/services/reloadService";
import request from "supertest";

let server: http.Server;

beforeAll((done) => {
  server = app.listen(0, done);
});

afterAll((done) => {
  server.close(done);
});

beforeEach(() => {
  clearStore();
  clearAuditLogs();
});

describe("Live reload SSE", () => {
  it("responds with text/event-stream content-type", (done) => {
    const addr = server.address() as { port: number };
    const req = http.get(
      `http://localhost:${addr.port}/reload`,
      (res) => {
        expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
        req.destroy();
        done();
      }
    );
  });

  it("sends a connected event on connection", (done) => {
    const addr = server.address() as { port: number };
    let buffer = "";
    const req = http.get(
      `http://localhost:${addr.port}/reload`,
      (res) => {
        res.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          if (buffer.includes("connected")) {
            const payload = buffer.match(/data: (.+)\n/)?.[1];
            expect(payload).toBeTruthy();
            const parsed = JSON.parse(payload!);
            expect(parsed.event).toBe("connected");
            req.destroy();
            done();
          }
        });
      }
    );
  });

  it("broadcasts a reload event when a config is updated", (done) => {
    const addr = server.address() as { port: number };
    let buffer = "";
    let updateReceived = false;

    const sseReq = http.get(
      `http://localhost:${addr.port}/reload`,
      (res) => {
        res.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n\n");
          for (const line of lines) {
            if (!line.trim()) continue;
            const match = line.match(/data: (.+)/);
            if (match) {
              const parsed = JSON.parse(match[1]);
              if (parsed.key === "live-key" && !updateReceived) {
                updateReceived = true;
                expect(parsed.environment).toBe("production");
                expect(parsed.version).toBe(1);
                sseReq.destroy();
                done();
              }
            }
          }
        });

        // Post a config update after connecting
        setTimeout(() => {
          request(app)
            .post("/configs/live-key")
            .send({ value: "new-val", environment: "production" })
            .then(() => {});
        }, 100);
      }
    );
  });
});
