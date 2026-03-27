import test from "node:test";
import assert from "node:assert/strict";

import { EntityServerClient } from "../dist/index.js";

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
    const calls = [];

    globalThis.fetch = async (input, init = {}) => {
        const url = String(input);
        calls.push({ url, init });

        if (url.endsWith("/v1/csrf-token")) {
            return jsonResponse({
                success: true,
                data: {
                    enabled: true,
                    token: "csrf-first",
                    headerName: "x-csrf-token",
                    refreshPath: "/v1/csrf-token",
                    expiresIn: 3600,
                },
            });
        }

        assert.equal(url, "https://example.com/v1/test");
        assert.equal(init.method, "POST");
        assert.equal(init.headers["x-csrf-token"], "csrf-first");

        return jsonResponse({ ok: true, data: { saved: true } });
    };

    try {
        const client = new EntityServerClient({
            baseUrl: "https://example.com",
            csrfEnabled: true,
        });

        const result = await client.requestJson(
            "POST",
            "/v1/test",
            { ok: true },
            false,
        );
        assert.deepEqual(result, { ok: true, data: { saved: true } });
        assert.equal(calls.length, 2);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("unsafe request retries once after csrf validation failure", async () => {
    const originalFetch = globalThis.fetch;
    const seenHeaders = [];
    let step = 0;

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
            assert.equal(url, "https://example.com/v1/csrf-token");
            return jsonResponse({
                success: true,
                data: {
                    enabled: true,
                    token: "csrf-fresh",
                    headerName: "x-csrf-token",
                    refreshPath: "/v1/csrf-token",
                    expiresIn: 3600,
                },
            });
        }

        assert.equal(url, "https://example.com/v1/test");
        seenHeaders.push(init.headers["x-csrf-token"]);
        return jsonResponse({ ok: true, data: { retried: true } });
    };

    try {
        const client = new EntityServerClient({
            baseUrl: "https://example.com",
            csrfEnabled: true,
            csrfToken: "csrf-stale",
        });

        const result = await client.requestJson(
            "POST",
            "/v1/test",
            { ok: true },
            false,
        );
        assert.deepEqual(result, { ok: true, data: { retried: true } });
        assert.deepEqual(seenHeaders, ["csrf-stale", "csrf-fresh"]);
        assert.equal(step, 2);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
