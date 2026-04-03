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

test("checkHealth does not enable packet encryption when packet_encryption is false", async () => {
    const originalFetch = globalThis.fetch;
    const originalDocument = globalThis.document;

    globalThis.document = { cookie: "anon_token=anon-123" };
    globalThis.fetch = async () =>
        jsonResponse({
            status: "ok",
            authenticated: false,
            packet_encryption: false,
        });

    try {
        const client = new EntityServerApi({
            baseUrl: "https://example.com",
        });

        await client.checkHealth(false);

        assert.equal(client.encryptRequests, false);
        assert.equal(client.anonymousPacketToken, "");
    } finally {
        globalThis.fetch = originalFetch;
        globalThis.document = originalDocument;
    }
});

test("checkHealth enables packet encryption only when packet_encryption is true", async () => {
    const originalFetch = globalThis.fetch;
    const originalDocument = globalThis.document;

    globalThis.document = { cookie: "anon_token=anon-123" };
    globalThis.fetch = async () =>
        jsonResponse({
            status: "ok",
            authenticated: false,
            packet_encryption: true,
        });

    try {
        const client = new EntityServerApi({
            baseUrl: "https://example.com",
        });

        await client.checkHealth(false);

        assert.equal(client.encryptRequests, true);
        assert.equal(client.anonymousPacketToken, "anon-123");
    } finally {
        globalThis.fetch = originalFetch;
        globalThis.document = originalDocument;
    }
});