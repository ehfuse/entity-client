import test from "node:test";
import assert from "node:assert/strict";

import { EntityServerApi } from "../dist/index.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

// 1.0.33 — keepSession 이면 첫 health 가 세션 되살리기를 겸하고, 첫 인증 요청이 그 결과를 쓴다(새로고침마다 health 가 두 번 돌던 것)
test("keepSession: initial health doubles as session bootstrap (one health before first authed request)", async () => {
    const originalFetch = globalThis.fetch;
    const originalDocument = globalThis.document;
    globalThis.document = { cookie: "" };
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
        const u = String(url);
        const headers = init.headers ?? {};
        calls.push({ path: new URL(u).pathname, boot: headers["X-Session-Bootstrap"] ?? "" });
        if (u.endsWith("/v1/health")) {
            return new Response(JSON.stringify({ status: "ok", authenticated: true }), {
                status: 200,
                headers: { "Content-Type": "application/json", "X-Access-Token": "aaa.eyJzdWIiOiIxIn0.ccc" },
            });
        }
        return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    try {
        const client = new EntityServerApi({ baseUrl: "https://example.com", keepSession: true });
        await tick();
        await tick();
        await client.get("/v1/auth/me").catch(() => undefined);
        const health = calls.filter((c) => c.path === "/v1/health");
        assert.equal(health.length, 1, JSON.stringify(calls));
        assert.equal(health[0].boot, "1");
    } finally {
        globalThis.fetch = originalFetch;
        globalThis.document = originalDocument;
    }
});

test("without keepSession: initial health is also the session bootstrap (1.0.34)", async () => {
    const originalFetch = globalThis.fetch;
    const originalDocument = globalThis.document;
    globalThis.document = { cookie: "" };
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
        calls.push({ path: new URL(String(url)).pathname, boot: (init.headers ?? {})["X-Session-Bootstrap"] ?? "" });
        return new Response(JSON.stringify({ status: "ok", authenticated: false }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    try {
        const client = new EntityServerApi({ baseUrl: "https://example.com" });
        await tick();
        await tick();
        // 앱의 세션 복원이 부르는 길 — 이미 끝난 첫 health 를 쓴다
        await client.ensureAuthenticatedRequestBootstrap();
        await client.get("/v1/auth/me").catch(() => undefined);
        const health = calls.filter((c) => c.path === "/v1/health");
        assert.equal(health.length, 1, JSON.stringify(calls));
        assert.equal(health[0].boot, "1");
    } finally {
        globalThis.fetch = originalFetch;
        globalThis.document = originalDocument;
    }
});
