// @ts-ignore
import { sha256 } from "@noble/hashes/sha2";
// @ts-ignore
import { hmac } from "@noble/hashes/hmac";

/**
 * HMAC-SHA256 서명 헤더를 생성합니다.
 *
 * 서명 대상: `METHOD|PATH|TIMESTAMP|NONCE|BODY`
 *
 * @returns `X-API-Key`, `X-Timestamp`, `X-Nonce`, `X-Signature` 헤더 객체
 */
export function buildHmacHeaders(
    method: string,
    path: string,
    bodyBytes: Uint8Array,
    apiKey: string,
    hmacSecret: string,
): Record<string, string> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = crypto.randomUUID();

    const prefix = new TextEncoder().encode(
        `${method}|${path}|${timestamp}|${nonce}|`,
    );
    const payload = new Uint8Array(prefix.length + bodyBytes.length);
    payload.set(prefix, 0);
    payload.set(bodyBytes, prefix.length);

    const sig = hmac(sha256, new TextEncoder().encode(hmacSecret), payload);
    const signature = [...sig]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return {
        "X-API-Key": apiKey,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature,
    };
}
