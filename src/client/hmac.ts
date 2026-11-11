// @ts-ignore
import { sha256 } from "@noble/hashes/sha2";
// @ts-ignore
import { hmac } from "@noble/hashes/hmac";

/**
 * HMAC 서명 판.
 *
 * - 판 1: `METHOD|PATH|TIMESTAMP|NONCE|BODY`
 * - 판 2: `METHOD|PATH|TIMESTAMP|NONCE|<X-License-Seq>|<X-Account-Seq>|BODY` + 요청 머리 `X-Signature-Version: 2`
 *
 * 판 1 은 범위 머리(X-License-Seq · X-Account-Seq)를 서명하지 않아, 서명된 요청을 가로챈 쪽이 그 머리만 바꿔
 * 다른 라이선스 · 계정 범위로 다시 보낼 수 있었다(보안 점검 2026-11-11 후속 4). 판 2 규격은 엔티티 서버 검증과
 * 한 글자도 다르면 안 된다 — 머리가 없으면 그 자리는 빈 글(구분자는 그대로), 값은 보내는 머리 글 그대로(앞뒤 공백 제거).
 */
export type HmacSignatureVersion = 1 | 2;

/**
 * 기본 판은 1 — 판 2 를 모르는 엔티티 서버는 `X-Signature-Version` 을 무시하고 판 1 로 검증해 401 이 된다.
 * 앱 서버는 `entity-client: ^1.0.x` 범위로 받으므로, 기본을 2 로 두면 패키지 설치만으로 옛 서버와 붙은 요청이 모두 끊긴다.
 * 판 2 를 받는 서버에서만 옵션 `signatureVersion: 2` 로 켠다.
 */
export const DEFAULT_HMAC_SIGNATURE_VERSION: HmacSignatureVersion = 1;

/** 머리 객체에서 이름을 대소문자 없이 찾는다 — 같은 이름이 둘이면 fetch(Headers) 처럼 ", " 로 잇는다. */
export function readHeaderValue(
    headers: Record<string, string>,
    name: string,
): string {
    const lower = name.toLowerCase();
    const values: string[] = [];
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === lower && value != null) {
            values.push(String(value));
        }
    }
    return values.join(", ").trim();
}

/** 서명 글(바이트)을 만든다. */
export function buildHmacSignaturePayload(
    version: HmacSignatureVersion,
    method: string,
    path: string,
    timestamp: string,
    nonce: string,
    headers: Record<string, string>,
    bodyBytes: Uint8Array,
): Uint8Array {
    const prefixText =
        version === 2
            ? `${method}|${path}|${timestamp}|${nonce}|${readHeaderValue(headers, "X-License-Seq")}|${readHeaderValue(headers, "X-Account-Seq")}|`
            : `${method}|${path}|${timestamp}|${nonce}|`;
    const prefix = new TextEncoder().encode(prefixText);
    const payload = new Uint8Array(prefix.length + bodyBytes.length);
    payload.set(prefix, 0);
    payload.set(bodyBytes, prefix.length);
    return payload;
}

/** HMAC-SHA256 16진 서명 값을 계산한다. */
export function computeHmacSignature(
    hmacSecret: string,
    payload: Uint8Array,
): string {
    const sig = hmac(sha256, new TextEncoder().encode(hmacSecret), payload);
    return [...(sig as Uint8Array)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * HMAC-SHA256 서명 헤더를 생성합니다.
 *
 * `signedHeaders` 는 이 요청에 **실제로 보낼 머리 전부**다 — 판 2 는 그 안의 X-License-Seq · X-Account-Seq 값을 서명한다.
 * 그래서 머리를 다 정한 뒤 마지막에 부르고, 돌려받은 머리를 더한 뒤로는 범위 머리를 바꾸지 않는다.
 *
 * @returns `X-API-Key`, `X-Timestamp`, `X-Nonce`, `X-Signature`(판 2 면 `X-Signature-Version` 도) 헤더 객체
 */
export function buildHmacHeaders(
    method: string,
    path: string,
    bodyBytes: Uint8Array,
    apiKey: string,
    hmacSecret: string,
    signedHeaders: Record<string, string> = {},
    version: HmacSignatureVersion = DEFAULT_HMAC_SIGNATURE_VERSION,
    fixed: { timestamp?: string; nonce?: string } = {},
): Record<string, string> {
    const timestamp = fixed.timestamp ?? String(Math.floor(Date.now() / 1000));
    const nonce = fixed.nonce ?? crypto.randomUUID();
    const resolvedVersion: HmacSignatureVersion = version === 1 ? 1 : 2;

    const payload = buildHmacSignaturePayload(
        resolvedVersion,
        method,
        path,
        timestamp,
        nonce,
        signedHeaders,
        bodyBytes,
    );
    const signature = computeHmacSignature(hmacSecret, payload);

    const headers: Record<string, string> = {
        "X-API-Key": apiKey,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature,
    };
    if (resolvedVersion === 2) headers["X-Signature-Version"] = "2";
    return headers;
}
