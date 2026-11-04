import test from "node:test";
import assert from "node:assert/strict";
import { EntityAppServerApi } from "../dist/index.js";

const jsonResponse = (body) =>
    new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

test("GET retries once after a network error", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = () => {
        calls += 1;
        if (calls === 1) return Promise.reject(new TypeError("Failed to fetch"));
        return Promise.resolve(jsonResponse({ ok: true, data: { n: 1 } }));
    };
    try {
        const client = new EntityAppServerApi({ baseUrl: "https://example.com" });
        const res = await client.http.get("/v1/mua/accounts", false);
        assert.equal(res.ok, true);
        assert.equal(calls, 2);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("POST does not retry after a network error", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = () => {
        calls += 1;
        return Promise.reject(new TypeError("Failed to fetch"));
    };
    try {
        const client = new EntityAppServerApi({ baseUrl: "https://example.com" });
        await assert.rejects(client.http.post("/v1/x", { a: 1 }, false), TypeError);
        assert.equal(calls, 1);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
