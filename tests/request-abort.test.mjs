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

function createDeferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

test("same PATCH path aborts previous in-flight request", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    let firstAborted = false;

    globalThis.fetch = (input, init = {}) => {
        calls.push({ url: String(input), init });

        if (calls.length === 1) {
            return new Promise((_, reject) => {
                init.signal.addEventListener(
                    "abort",
                    () => {
                        firstAborted = true;
                        const error = new Error("Request aborted");
                        error.name = "AbortError";
                        reject(error);
                    },
                    { once: true },
                );
            });
        }

        return Promise.resolve(jsonResponse({ ok: true, data: { saved: 2 } }));
    };

    try {
        const client = new EntityAppServerApi({
            baseUrl: "https://example.com",
        });

        const first = client.http.patch(
            "/v1/funeral/event/13",
            { value: 1 },
            false,
        );
        await Promise.resolve();
        const second = client.http.patch(
            "/v1/funeral/event/13",
            { value: 2 },
            false,
        );

        await assert.rejects(first, (error) => error?.name === "AbortError");
        await assert.doesNotReject(second);
        assert.equal(firstAborted, true);
        assert.equal(calls.length, 2);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("different PATCH paths keep separate in-flight requests", async () => {
    const originalFetch = globalThis.fetch;
    const firstDeferred = createDeferred();
    let firstAborted = false;

    globalThis.fetch = (input, init = {}) => {
        const url = String(input);

        if (url.endsWith("/v1/funeral/event/13")) {
            init.signal.addEventListener(
                "abort",
                () => {
                    firstAborted = true;
                    const error = new Error("Request aborted");
                    error.name = "AbortError";
                    firstDeferred.reject(error);
                },
                { once: true },
            );
            return firstDeferred.promise;
        }

        return Promise.resolve(jsonResponse({ ok: true, data: { saved: 14 } }));
    };

    try {
        const client = new EntityAppServerApi({
            baseUrl: "https://example.com",
        });

        const first = client.http.patch(
            "/v1/funeral/event/13",
            { value: 1 },
            false,
        );
        await Promise.resolve();
        const second = client.http.patch(
            "/v1/funeral/event/14",
            { value: 2 },
            false,
        );

        await assert.doesNotReject(second);
        assert.equal(firstAborted, false);

        firstDeferred.resolve(jsonResponse({ ok: true, data: { saved: 13 } }));
        await assert.doesNotReject(first);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("same POST path aborts previous in-flight request", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    let firstAborted = false;

    globalThis.fetch = (input, init = {}) => {
        calls.push({ url: String(input), init });

        if (calls.length === 1) {
            return new Promise((_, reject) => {
                init.signal.addEventListener(
                    "abort",
                    () => {
                        firstAborted = true;
                        const error = new Error("Request aborted");
                        error.name = "AbortError";
                        reject(error);
                    },
                    { once: true },
                );
            });
        }

        return Promise.resolve(jsonResponse({ ok: true, data: { saved: 2 } }));
    };

    try {
        const client = new EntityAppServerApi({
            baseUrl: "https://example.com",
        });

        const first = client.http.post(
            "/v1/funeral/event",
            { value: 1 },
            false,
        );
        await Promise.resolve();
        const second = client.http.post(
            "/v1/funeral/event",
            { value: 2 },
            false,
        );

        await assert.rejects(first, (error) => error?.name === "AbortError");
        await assert.doesNotReject(second);
        assert.equal(firstAborted, true);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("auto abort can be explicitly disabled per request", async () => {
    const originalFetch = globalThis.fetch;
    let firstAborted = false;
    let callCount = 0;

    globalThis.fetch = (input, init = {}) => {
        const url = String(input);
        if (url.endsWith("/v1/funeral/event")) {
            callCount += 1;
            if (init.signal && !init.signal.aborted) {
                init.signal.addEventListener(
                    "abort",
                    () => {
                        firstAborted = true;
                    },
                    { once: true },
                );
            }
            return Promise.resolve(
                jsonResponse({ ok: true, data: { saved: callCount } }),
            );
        }

        return Promise.resolve(jsonResponse({ ok: true, data: {} }));
    };

    try {
        const client = new EntityAppServerApi({
            baseUrl: "https://example.com",
        });

        const first = client.http.post(
            "/v1/funeral/event",
            { value: 1 },
            false,
            undefined,
            { autoAbortKey: false },
        );
        await Promise.resolve();
        const second = client.http.post(
            "/v1/funeral/event",
            { value: 2 },
            false,
            undefined,
            { autoAbortKey: false },
        );

        await Promise.resolve();
        assert.equal(firstAborted, false);
        await assert.doesNotReject(first);
        await assert.doesNotReject(second);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("setToken reconnects realtime when enabled", async () => {
    const originalWebSocket = globalThis.WebSocket;

    globalThis.WebSocket = class WebSocketStub {};

    try {
        const client = new EntityAppServerApi({
            baseUrl: "https://example.com",
        });

        let connectCallCount = 0;
        client.realtimeEnabled = true;
        client.connectRealtime = () => {
            connectCallCount += 1;
            return Promise.resolve();
        };

        client.setToken("restored-token");
        await Promise.resolve();

        assert.equal(connectCallCount, 1);
    } finally {
        globalThis.WebSocket = originalWebSocket;
    }
});
