import {
    derivePacketKey as derivePacketKeyCore,
    encryptPacket as encryptPacketCore,
    decryptPacket as decryptPacketCore,
} from "../packet.js";

/**
 * 패킷 암호화 키를 유도합니다.
 * - HMAC 모드 (`hmacSecret` 유효 시): HKDF-SHA256(hmac_secret, "entity-server:packet-encryption")
 * - JWT  모드: HKDF-SHA256(jwt_token, "entity-server:packet-encryption")
 */
export function derivePacketKey(hmacSecret: string, token: string): Uint8Array {
    return derivePacketKeyCore(hmacSecret || token);
}

/**
 * 평문 바이트를 XChaCha20-Poly1305로 암호화합니다.
 * 포맷: [random_magic:K][random_nonce:24][ciphertext+tag]
 * K = 2 + key[31] % 14 (패킷 키에서 자동 파생)
 */
export function encryptPacket(
    plaintext: Uint8Array,
    key: Uint8Array,
): Uint8Array {
    return encryptPacketCore(plaintext, key);
}

/**
 * XChaCha20-Poly1305 패킷을 복호화해 JSON 객체로 변환합니다.
 * 포맷: [magic:K][nonce:24][ciphertext+tag]
 * K = 2 + key[31] % 14 (패킷 키에서 자동 파생)
 */
export function decryptPacket<T>(buffer: ArrayBuffer, key: Uint8Array): T {
    const plaintext = decryptPacketCore(buffer, key);
    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

/**
 * 요청 바디를 파싱합니다. `application/octet-stream`이면 복호화, 그 외는 JSON 파싱합니다.
 *
 * @param requireEncrypted `true`이면 암호화된 요청만 허용합니다.
 */
export function parseRequestBody<T>(
    body: ArrayBuffer | Uint8Array | string | T | null | undefined,
    contentType: string,
    requireEncrypted: boolean,
    key: Uint8Array,
): T {
    const isEncrypted = contentType
        .toLowerCase()
        .includes("application/octet-stream");

    if (requireEncrypted && !isEncrypted) {
        throw new Error(
            "Encrypted request required: Content-Type must be application/octet-stream",
        );
    }

    if (isEncrypted) {
        if (body == null) throw new Error("Encrypted request body is empty");
        if (body instanceof ArrayBuffer) return decryptPacket<T>(body, key);
        if (body instanceof Uint8Array) {
            const sliced = body.buffer.slice(
                body.byteOffset,
                body.byteOffset + body.byteLength,
            );
            return decryptPacket<T>(sliced as ArrayBuffer, key);
        }
        throw new Error(
            "Encrypted request body must be ArrayBuffer or Uint8Array",
        );
    }

    if (body == null || body === "") return {} as T;
    if (typeof body === "string") return JSON.parse(body) as T;
    return body as T;
}
