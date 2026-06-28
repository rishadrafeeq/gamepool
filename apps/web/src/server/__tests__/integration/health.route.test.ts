import { describe, expect, it } from "vitest";

import { GET } from "../../../../app/api/v1/health/route";

describe("GET /api/v1/health", () => {
  it("returns liveness payload", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("ok");
    expect(body.data.service).toBe("gamepool-api");
    expect(body.data.version).toBe("v1");
    expect(body.data.timestamp).toBeDefined();
  });
});
