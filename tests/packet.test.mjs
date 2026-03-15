import test from "node:test";
import assert from "node:assert/strict";

import {
    derivePacketKey,
    packetMagicLenFromKey,
    encryptPacket,
    decryptPacket,
    PACKET_MAGIC_MIN,
    PACKET_MAGIC_RANGE,
    PACKET_NONCE_SIZE,
    PACKET_TAG_SIZE,
} from "../dist/packet.js";

test("packet core roundtrips plaintext", () => {
    const key = derivePacketKey("packet-test-token");
    const payload = new TextEncoder().encode(
        JSON.stringify({ ok: true, message: "hello" }),
    );

    const encrypted = encryptPacket(payload, key);
    const decrypted = decryptPacket(encrypted, key);

    assert.equal(
        new TextDecoder().decode(decrypted),
        JSON.stringify({ ok: true, message: "hello" }),
    );
});

test("packet core derives a stable magic length from key", () => {
    const key = derivePacketKey("packet-test-token");
    const magicLen = packetMagicLenFromKey(key);

    assert.ok(magicLen >= PACKET_MAGIC_MIN);
    assert.ok(magicLen < PACKET_MAGIC_MIN + PACKET_MAGIC_RANGE);
    assert.equal(magicLen, packetMagicLenFromKey(key));
});

test("encrypted packet has expected minimum shape", () => {
    const key = derivePacketKey("packet-test-token");
    const payload = new TextEncoder().encode("abc");
    const magicLen = packetMagicLenFromKey(key);

    const encrypted = encryptPacket(payload, key);

    assert.ok(
        encrypted.length >=
            magicLen + PACKET_NONCE_SIZE + PACKET_TAG_SIZE + payload.length,
    );
});