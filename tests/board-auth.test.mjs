import test from "node:test";
import assert from "node:assert/strict";

import { EntityAppServerApi } from "../dist/index.js";

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
        },
    });
}

test("board list sends bearer token when client token exists", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input, init = {}) => {
        assert.equal(String(input), "https://example.com/v1/board/notice/list?page=1");
        assert.equal(init.method, "GET");
        assert.equal(init.headers.Authorization, "Bearer token-123");
        return jsonResponse({ ok: true, data: { items: [], total: 0 } });
    };

    try {
        const client = new EntityAppServerApi({
            baseUrl: "https://example.com",
            token: "token-123",
        });

        const result = await client.listBoardPosts("notice", { page: 1 });
        assert.equal(result.ok, true);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("board detail sends bearer token when client token exists", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input, init = {}) => {
        assert.equal(String(input), "https://example.com/v1/board/posts/7");
        assert.equal(init.method, "GET");
        assert.equal(init.headers.Authorization, "Bearer token-123");
        return jsonResponse({ ok: true, data: { seq: 7 } });
    };

    try {
        const client = new EntityAppServerApi({
            baseUrl: "https://example.com",
            token: "token-123",
        });

        const result = await client.getBoardPost(7);
        assert.equal(result.ok, true);
        assert.equal(result.data.seq, 7);
    } finally {
        globalThis.fetch = originalFetch;
    }
});