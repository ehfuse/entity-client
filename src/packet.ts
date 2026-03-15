// @ts-ignore
import { xchacha20poly1305 } from "@noble/ciphers/chacha";
// @ts-ignore
import { sha256 } from "@noble/hashes/sha2";
// @ts-ignore
import { hkdf } from "@noble/hashes/hkdf";

export const PACKET_KEY_SIZE = 32;
export const PACKET_MAGIC_MIN = 2;
export const PACKET_MAGIC_RANGE = 14;
export const PACKET_NONCE_SIZE = 24;
export const PACKET_TAG_SIZE = 16;
export const PACKET_HKDF_SALT = "entity-server:hkdf:v1";
export const PACKET_INFO_LABEL = "entity-server:packet-encryption";

function toUint8Array(data: ArrayBuffer | Uint8Array): Uint8Array {
    return data instanceof Uint8Array ? data : new Uint8Array(data);
}

export function derivePacketKey(
    source: string,
    infoLabel = PACKET_INFO_LABEL,
): Uint8Array {
    return hkdf(
        sha256,
        new TextEncoder().encode(source),
        new TextEncoder().encode(PACKET_HKDF_SALT),
        new TextEncoder().encode(infoLabel),
        PACKET_KEY_SIZE,
    );
}

export function packetMagicLenFromKey(
    key: ArrayBuffer | Uint8Array,
    magicMin = PACKET_MAGIC_MIN,
    magicRange = PACKET_MAGIC_RANGE,
): number {
    const keyBytes = toUint8Array(key);
    if (keyBytes.length < PACKET_KEY_SIZE) return magicMin;
    return magicMin + (keyBytes[PACKET_KEY_SIZE - 1]! % magicRange);
}

export function encryptPacket(
    plaintext: ArrayBuffer | Uint8Array,
    key: ArrayBuffer | Uint8Array,
    magicMin = PACKET_MAGIC_MIN,
    magicRange = PACKET_MAGIC_RANGE,
): Uint8Array {
    const plaintextBytes = toUint8Array(plaintext);
    const keyBytes = toUint8Array(key);
    const magicLen = packetMagicLenFromKey(keyBytes, magicMin, magicRange);
    const magic = crypto.getRandomValues(new Uint8Array(magicLen));
    const nonce = crypto.getRandomValues(new Uint8Array(PACKET_NONCE_SIZE));
    const cipher = xchacha20poly1305(keyBytes, nonce);
    const ciphertext = cipher.encrypt(plaintextBytes);
    const result = new Uint8Array(
        magicLen + PACKET_NONCE_SIZE + ciphertext.length,
    );

    result.set(magic, 0);
    result.set(nonce, magicLen);
    result.set(ciphertext, magicLen + PACKET_NONCE_SIZE);
    return result;
}

export function decryptPacket(
    buffer: ArrayBuffer | Uint8Array,
    key: ArrayBuffer | Uint8Array,
    magicMin = PACKET_MAGIC_MIN,
    magicRange = PACKET_MAGIC_RANGE,
): Uint8Array {
    const data = toUint8Array(buffer);
    const keyBytes = toUint8Array(key);
    const magicLen = packetMagicLenFromKey(keyBytes, magicMin, magicRange);

    if (data.length < magicLen + PACKET_NONCE_SIZE + PACKET_TAG_SIZE) {
        throw new Error("Encrypted packet too short");
    }

    const nonce = data.slice(magicLen, magicLen + PACKET_NONCE_SIZE);
    const ciphertext = data.slice(magicLen + PACKET_NONCE_SIZE);
    const cipher = xchacha20poly1305(keyBytes, nonce);
    return cipher.decrypt(ciphertext);
}
