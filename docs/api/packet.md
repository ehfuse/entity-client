# 암호화 패킷 처리

## 자동 복호화

서버 응답이 `Content-Type: application/octet-stream`이면 `request()` 내부에서 자동으로 복호화됩니다.
XChaCha20-Poly1305 알고리즘을 사용하며, 키는 현재 JWT 토큰의 SHA-256 해시입니다.

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
