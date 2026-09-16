import test from "node:test";
import assert from "node:assert/strict";

import { EntityServerApi } from "../dist/index.js";

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

/** fetch 를 가로채 (url, method, Authorization) 을 기록하고 정해진 응답을 돌려준다. */
async function captureFetch(body, run) {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (input, init = {}) => {
        calls.push({
            url: String(input),
            method: init.method,
            authorization: init.headers?.Authorization,
        });
        return jsonResponse(body);
    };
    try {
        await run(
            new EntityServerApi({
                baseUrl: "https://example.com",
                token: "token-123",
            }),
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
    return calls;
}

// 트랜잭션을 여는 호출만 인증이 빠져 ES 가 401 로 거절하던 회귀를 막는다.
// 증상이 삼켜지기 쉬운 자리라(호출부가 try/catch 로 감싸 warn 만 남김) 테스트로 못 박아 둔다.
test("transStart 는 Bearer 토큰을 붙인다", async () => {
    const calls = await captureFetch(
        { ok: true, transaction_id: "TX1" },
        async (client) => {
            const txId = await client.transStart();
            assert.equal(txId, "TX1");
        },
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://example.com/v1/transaction/start");
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].authorization, "Bearer token-123");
});

test("transCommit·transRollback 도 Bearer 토큰을 붙인다", async () => {
    const commit = await captureFetch({ ok: true, results: [] }, (client) =>
        client.transCommit("TX1"),
    );
    assert.equal(commit[0].authorization, "Bearer token-123");

    const rollback = await captureFetch({ ok: true }, (client) =>
        client.transRollback("TX1"),
    );
    assert.equal(rollback[0].authorization, "Bearer token-123");
});

// 쿠키·refresh_token 으로 인증하는 세션 엔드포인트다 — 만료된 access token 을 붙이면 오히려 실패한다.
test("세션 엔드포인트는 Authorization 을 붙이지 않는다", async () => {
    const refresh = await captureFetch(
        { ok: true, data: { access_token: "new" } },
        (client) => client.tokenRefresh().catch(() => {}),
    );
    assert.equal(refresh[0].url, "https://example.com/v1/auth/token_refresh");
    assert.equal(refresh[0].authorization, undefined);

    const logout = await captureFetch({ ok: true }, (client) =>
        client.logout().catch(() => {}),
    );
    assert.equal(logout[0].url, "https://example.com/v1/auth/logout");
    assert.equal(logout[0].authorization, undefined);
});
