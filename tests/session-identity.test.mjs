import test from "node:test";
import assert from "node:assert/strict";

import {
    EntityServerApi,
    decodeJwtPayload,
    sameJwtIdentity,
} from "../dist/index.js";

/** 테스트용 무서명 JWT 를 만든다 (payload 만 유효). */
function makeToken(payload) {
    const encode = (obj) =>
        Buffer.from(JSON.stringify(obj), "utf-8")
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.sig`;
}

function healthResponse(accessToken) {
    const headers = { "Content-Type": "application/json" };
    if (accessToken) {
        headers["X-Access-Token"] = accessToken;
    }
    return new Response(
        JSON.stringify({ status: "ok", authenticated: true }),
        { status: 200, headers },
    );
}

const tokenLicense101 = makeToken({ sub: 5, license_seq: 101, name: "관리자" });
const tokenLicense7 = makeToken({ sub: 42, license_seq: 7, name: "관리자3" });
const tokenLicense101Renewed = makeToken({
    sub: 5,
    license_seq: 101,
    name: "관리자",
    iat: 2,
});

test("decodeJwtPayload decodes UTF-8 payloads without verification", () => {
    const payload = decodeJwtPayload(tokenLicense7);
    assert.equal(payload.sub, 42);
    assert.equal(payload.license_seq, 7);
    assert.equal(payload.name, "관리자3");
    assert.equal(decodeJwtPayload("not-a-jwt"), null);
    assert.equal(decodeJwtPayload(""), null);
});

test("sameJwtIdentity compares account and license", () => {
    assert.equal(sameJwtIdentity(tokenLicense101, tokenLicense101Renewed), true);
    assert.equal(sameJwtIdentity(tokenLicense101, tokenLicense7), false);
    assert.equal(sameJwtIdentity(tokenLicense101, "broken"), false);
    assert.equal(sameJwtIdentity(null, tokenLicense7), false);
});

test("checkHealth sends current token and rejects cross-account access token", async () => {
    const originalFetch = globalThis.fetch;
    const originalDocument = globalThis.document;

    globalThis.document = { cookie: "" };
    let seenAuthorization = null;
    // 공유 쿠키가 다른 계정(license 101) 소유가 된 상황을 흉내낸다.
    globalThis.fetch = async (_url, options) => {
        seenAuthorization = options?.headers?.Authorization ?? null;
        return healthResponse(tokenLicense101Renewed);
    };

    try {
        const client = new EntityServerApi({ baseUrl: "https://example.com" });
        client.setToken(tokenLicense7);

        await client.checkHealth(true);

        // 현재 토큰이 Authorization 으로 동봉되어야 한다.
        assert.equal(seenAuthorization, `Bearer ${tokenLicense7}`);
        // 다른 계정의 토큰은 채택되지 않고 기존 토큰이 유지되어야 한다.
        assert.equal(client.token, tokenLicense7);
    } finally {
        globalThis.fetch = originalFetch;
        globalThis.document = originalDocument;
    }
});

test("checkHealth adopts same-account renewed token and bootstraps empty token", async () => {
    const originalFetch = globalThis.fetch;
    const originalDocument = globalThis.document;

    globalThis.document = { cookie: "" };

    try {
        // 같은 계정 갱신 → 채택
        globalThis.fetch = async () => healthResponse(tokenLicense101Renewed);
        const client = new EntityServerApi({ baseUrl: "https://example.com" });
        client.setToken(tokenLicense101);
        await client.checkHealth(true);
        assert.equal(client.token, tokenLicense101Renewed);

        // 토큰 없는 새 탭 복원 → 쿠키 세션 채택 허용
        const fresh = new EntityServerApi({ baseUrl: "https://example.com" });
        await fresh.checkHealth(true);
        assert.equal(fresh.token, tokenLicense101Renewed);
    } finally {
        globalThis.fetch = originalFetch;
        globalThis.document = originalDocument;
    }
});
