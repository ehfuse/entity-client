import test from "node:test";
import assert from "node:assert/strict";

import { EntityServerApi } from "../dist/index.js";

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
        },
    });
}

test("unsafe request refreshes csrf token before first send", async () => {
    const originalFetch = globalThis.fetch;
    const originalDocument = globalThis.document;
    const calls = [];

    globalThis.document = { cookie: "" };

    globalThis.fetch = async (input, init = {}) => {
        const url = String(input);
        calls.push({ url, init });

        if (url.endsWith("/v1/health")) {
            globalThis.document.cookie = "_csrf=csrf-first";
            return jsonResponse({
                status: "ok",
            });
        }

        assert.equal(url, "https://example.com/v1/test");
        assert.equal(init.method, "POST");
        assert.equal(init.headers["x-csrf-token"], "csrf-first");

        return jsonResponse({ ok: true, data: { saved: true } });
    };

    try {
        const client = new EntityServerApi({
            baseUrl: "https://example.com",
            csrfEnabled: true,
        });

        const result = await client.http.post("/v1/test", { ok: true }, false);
        assert.deepEqual(result, { ok: true, data: { saved: true } });
        assert.equal(calls.length, 2);
    } finally {
        globalThis.fetch = originalFetch;
        globalThis.document = originalDocument;
    }
});

test("unsafe request retries once after csrf validation failure", async () => {
    const originalFetch = globalThis.fetch;
    const originalDocument = globalThis.document;
    const seenHeaders = [];
    let step = 0;

    globalThis.document = { cookie: "_csrf=csrf-stale" };

    globalThis.fetch = async (input, init = {}) => {
        const url = String(input);

        if (step === 0) {
            step += 1;
            assert.equal(url, "https://example.com/v1/test");
            seenHeaders.push(init.headers["x-csrf-token"]);
            return jsonResponse(
                { success: false, error: "CSRF token validation failed" },
                403,
            );
        }

        if (step === 1) {
            step += 1;
            assert.equal(url, "https://example.com/v1/health");
            globalThis.document.cookie = "_csrf=csrf-fresh";
            return jsonResponse({
                status: "ok",
            });
        }

        assert.equal(url, "https://example.com/v1/test");
        seenHeaders.push(init.headers["x-csrf-token"]);
        return jsonResponse({ ok: true, data: { retried: true } });
    };

    try {
        const client = new EntityServerApi({
            baseUrl: "https://example.com",
            csrfEnabled: true,
        });

        const result = await client.http.post("/v1/test", { ok: true }, false);
        assert.deepEqual(result, { ok: true, data: { retried: true } });
        assert.deepEqual(seenHeaders, ["csrf-stale", "csrf-fresh"]);
        assert.equal(step, 2);
    } finally {
        globalThis.fetch = originalFetch;
        globalThis.document = originalDocument;
    }
});
