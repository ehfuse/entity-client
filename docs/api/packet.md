# 암호화 패킷 처리

## 자동 복호화

서버 응답이 `Content-Type: application/octet-stream`이면 `request()` 내부에서 자동으로 복호화됩니다.
XChaCha20-Poly1305 알고리즘을 사용하며, 키는 HKDF-SHA256으로 파생됩니다.

- 키 소스: `hmacSecret` → `token`(JWT) → `anonymousPacketToken` 순서로 결정
- salt: `entity-server:hkdf:v1`
- info: `entity-server:packet-encryption`
- 출력: 32바이트

별도 처리 없이 일반 응답과 동일하게 사용하면 됩니다.

## `readRequestBody(body, contentType?, requireEncrypted?)`

원시 암호화 payload를 직접 파싱할 때 사용합니다.
주로 서버 측 미들웨어나 SSR 환경에서 클라이언트로부터 받은 암호화 body를 처리할 때 활용합니다.

```ts
// 암호화 body 복호화
const data = client.readRequestBody(
    arrayBuffer, // ArrayBuffer | Uint8Array
    "application/octet-stream",
    true, // requireEncrypted: 암호화 아니면 에러
);

// 일반 JSON body 파싱
const data2 = client.readRequestBody(jsonString, "application/json");
```

## `entity-server-client/packet` 서브패스 — 프로토콜 코어

패킷 암복호 프로토콜만 독립적으로 사용할 때는 서브패스를 import합니다.
브라우저, Node.js, 중간 계층 서버 등 SDK 전체가 불필요한 환경에서 유용합니다.

```ts
import {
    derivePacketKey,
    packetMagicLenFromKey,
    encryptPacket,
    decryptPacket,
    PACKET_KEY_SIZE,
    PACKET_MAGIC_MIN,
    PACKET_MAGIC_RANGE,
    PACKET_NONCE_SIZE,
    PACKET_TAG_SIZE,
    PACKET_HKDF_SALT,
    PACKET_INFO_LABEL,
} from "entity-server-client/packet";
```

### `derivePacketKey(source, infoLabel?)`

HKDF-SHA256으로 32바이트 패킷 키를 파생합니다.

```ts
const key = derivePacketKey("anon.v1.example-token");
// infoLabel 기본값: "entity-server:packet-encryption"
```

### `packetMagicLenFromKey(key, magicMin?, magicRange?)`

키에서 magic 바이트 길이를 파생합니다. `magicLen = magicMin + key[31] % magicRange`

```ts
const magicLen = packetMagicLenFromKey(key);
// 기본값: magicMin=2, magicRange=14 → 결과 범위 [2, 15]
```

### `encryptPacket(plaintext, key, magicMin?, magicRange?)`

평문 바이트를 XChaCha20-Poly1305로 암호화합니다.
포맷: `[random_magic:magicLen][random_nonce:24][ciphertext+tag]`

```ts
const encrypted = encryptPacket(
    new TextEncoder().encode(JSON.stringify({ ok: true })),
    key,
);
```

### `decryptPacket(buffer, key, magicMin?, magicRange?)`

암호화된 패킷을 복호화해 평문 바이트를 반환합니다.

```ts
const plaintext = decryptPacket(encrypted, key);
console.log(new TextDecoder().decode(plaintext));
```
