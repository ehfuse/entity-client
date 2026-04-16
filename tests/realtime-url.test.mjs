import test from "node:test";
import assert from "node:assert/strict";

import { EntityAppServerApi } from "../dist/index.js";

test("realtime URL preserves relative /api prefix in browser", () => {
    const originalWindow = globalThis.window;

    globalThis.window = {
        location: {
            origin: "https://codeshop.kr",
        },
    };

    try {
        const client = new EntityAppServerApi({
            baseUrl: "/api",
            token: "token-123",
            realtime: { enabled: true, autoConnect: false },
        });

        assert.equal(
            client.buildRealtimeUrl(),
            "wss://codeshop.kr/api/v1/realtime?access_token=token-123",
        );
    } finally {
        globalThis.window = originalWindow;
    }
});

test("realtime URL keeps absolute host without adding api prefix", () => {
    const client = new EntityAppServerApi({
        baseUrl: "http://182.162.21.197:37200",
        token: "token-123",
        realtime: { enabled: true, autoConnect: false },
    });

    assert.equal(
        client.buildRealtimeUrl(),
        "ws://182.162.21.197:37200/v1/realtime?access_token=token-123",
    );
});
