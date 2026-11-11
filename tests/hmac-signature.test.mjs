import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { EntityServerApi } from "../dist/index.js";
import { buildHmacHeaders } from "../dist/client/hmac.js";

// 판 2 서명(보안 점검 2026-11-11 후속 4) — 기대값은 규격대로 파이썬 hmac 으로 따로 계산한 값이다.
// 서명 글 = METHOD|PATH|timestamp|nonce|<X-License-Seq>|<X-Account-Seq>|body (머리가 없으면 빈 글)
const SECRET = "test-hmac-secret-0123456789abcdef0123";
const TS = "1762850000";
const NONCE = "11111111-2222-3333-4444-555555555555";
const BODY = '{"conditions":{"seq":1},"name":"한글"}';
const PATH = "/v1/entity/account/list";
const bodyBytes = new TextEncoder().encode(BODY);
const fixed = { timestamp: TS, nonce: NONCE };

test("판 1 고정 시험값 — 범위 머리를 서명하지 않고 판 머리도 없다", () => {
    const h = buildHmacHeaders("POST", PATH, bodyBytes, "k", SECRET, { "X-Account-Seq": "345" }, 1, fixed);
    assert.equal(h["X-Signature"], "e51313cc69f5b48e058481b754c710ab2346272d846e6d48828155c3b681fc60");
    assert.equal(h["X-Signature-Version"], undefined);
});

test("판 2 고정 시험값 — 머리 없음 · 둘 다 · 한쪽만 · 본문 없는 GET", () => {
    const sig = (method, path, headers, body = bodyBytes) =>
        buildHmacHeaders(method, path, body, "k", SECRET, headers, 2, fixed)["X-Signature"];
    assert.equal(sig("POST", PATH, {}), "17447e1e74b8b97bb2592b2109564fc67ced57aa74adae71f1714031078459d6");
    assert.equal(
        sig("POST", PATH, { "X-License-Seq": "12", "X-Account-Seq": "345" }),
        "c42d4ea7d9dd53d3292b6e69d9db167ddba9cd75d2576d3b3a0d9503a5053df0",
    );
    // 이름 대소문자 · 앞뒤 공백은 결과를 바꾸지 않는다
    assert.equal(
        sig("POST", PATH, { "x-license-seq": " 12 ", "x-account-seq": "345" }),
        "c42d4ea7d9dd53d3292b6e69d9db167ddba9cd75d2576d3b3a0d9503a5053df0",
    );
    assert.equal(sig("POST", PATH, { "X-License-Seq": "12" }), "889030e071461d29204ed66806c5026fdd939de54670a103753b8f24c291ab97");
    assert.equal(sig("POST", PATH, { "X-Account-Seq": "345" }), "b2a472b42a2118158c77c68c743559d0aba7078280a034cdad5a2cda5fe009a8");
    assert.equal(
        sig("GET", "/v1/entity/account/1", { "X-License-Seq": "12", "X-Account-Seq": "345" }, new Uint8Array(0)),
        "115c9e5fb71500d4cc61995d8484d0ea2823b0d1d98da818351939595b3cb72d",
    );
    const h = buildHmacHeaders("POST", PATH, bodyBytes, "k", SECRET, {}, 2, fixed);
    assert.equal(h["X-Signature-Version"], "2");
});

/** fetch 를 가로채 보낸 머리 · 본문을 기록한다. */
async function captureFetch(clientOptions, run) {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (input, init = {}) => {
        calls.push({ url: String(input), method: init.method, headers: { ...init.headers }, body: init.body });
        return new Response(JSON.stringify({ ok: true, data: { items: [] } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    };
    try {
        await run(new EntityServerApi({ baseUrl: "https://example.com", apiKey: "k", hmacSecret: SECRET, ...clientOptions }));
    } finally {
        globalThis.fetch = originalFetch;
    }
    return calls;
}

/** 실제로 보낸 머리로 서명을 따로(node:crypto) 다시 계산한다. */
function expectedSignature(call, version) {
    const h = call.headers;
    const path = new URL(call.url).pathname + new URL(call.url).search;
    const scope = version === 2 ? `${(h["X-License-Seq"] ?? "").trim()}|${(h["X-Account-Seq"] ?? "").trim()}|` : "";
    const prefix = `${call.method}|${path}|${h["X-Timestamp"]}|${h["X-Nonce"]}|${scope}`;
    const body = call.body == null ? Buffer.alloc(0) : Buffer.from(call.body);
    return createHmac("sha256", SECRET).update(Buffer.concat([Buffer.from(prefix, "utf-8"), body])).digest("hex");
}

test("기본은 판 1 — 판 머리 없이 지금과 같은 서명", async () => {
    const calls = await captureFetch({}, async (client) => {
        await client.request("POST", "/v1/entity/account/list", { page: 1 }, true, { "X-Account-Seq": "345" });
    });
    const call = calls[0];
    assert.equal(call.headers["X-Signature-Version"], undefined);
    assert.equal(call.headers["X-Signature"], expectedSignature(call, 1));
});

test("판 2: 요청별 범위 머리(extraHeaders)까지 서명해 보낸다", async () => {
    const calls = await captureFetch({ signatureVersion: 2 }, async (client) => {
        await client.request("POST", "/v1/entity/account/list", { page: 1 }, true, {
            "X-Account-Seq": "345",
            "X-License-Seq": "12",
        });
    });
    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.equal(call.headers["X-Signature-Version"], "2");
    assert.equal(call.headers["X-Account-Seq"], "345");
    assert.equal(call.headers["X-Signature"], expectedSignature(call, 2));
    assert.notEqual(call.headers["X-Signature"], expectedSignature(call, 1));
});

test("signatureVersion: 1 이면 지금과 같은 판 1 서명, 판 머리 없음", async () => {
    const calls = await captureFetch({ signatureVersion: 1 }, async (client) => {
        await client.request("POST", "/v1/entity/account/list", { page: 1 }, true, { "X-Account-Seq": "345" });
    });
    const call = calls[0];
    assert.equal(call.headers["X-Signature-Version"], undefined);
    assert.equal(call.headers["X-Signature"], expectedSignature(call, 1));
});

test("configure 로 판을 바꿀 수 있다", async () => {
    const calls = await captureFetch({ signatureVersion: 1 }, async (client) => {
        client.configure({ signatureVersion: 2 });
        await client.request("GET", "/v1/entity/account/1", undefined, true, { "X-License-Seq": "7" });
    });
    const call = calls[0];
    assert.equal(call.headers["X-Signature-Version"], "2");
    assert.equal(call.headers["X-Signature"], expectedSignature(call, 2));
});
