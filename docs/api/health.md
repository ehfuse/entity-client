# 서버 헬스체크

## 개요

앱 시작 시 서버의 패킷 암호화 설정을 감지하여 클라이언트 설정을 자동으로 맞춥니다.

**헬스체크 응답:**

```json
{
    "ok": true,
    "packet_encryption": true,
    "packet_mode": "anonymous",
    "packet_token": "anon.v1...."
}
```

- `packet_encryption`: 서버가 패킷 암호화를 요구하는지 여부
- `packet_mode`: `"jwt"` (JWT 인증) 또는 `"anonymous"` (익명 토큰)
- `packet_token`: `anonymous` 모드일 때 포함. `checkHealth()` 호출 시 클라이언트 내부 `anonymousPacketToken`에 **자동 저장**됨

## 자동 초기화 (권장)

**admin-web 예시:**

```ts
import { entityServer } from "entity-server-client";

// 앱 초기화 시 한 번 실행 (예: App.tsx mount, main.tsx 초기화)
const health = await entityServer.checkHealth();
// → 서버의 packet_encryption: true 이면
//   클라이언트의 encryptRequests: true 로 자동 설정됨
```

**수동 초기화:**

```ts
const res = await fetch("/v1/health");
const { packet_encryption } = await res.json();

if (packet_encryption) {
    entityServer.configure({ encryptRequests: true });
}
```

> **주의:** 패킷 magic 길이(K)는 `K = 2 + key[31] % 14` 공식으로 패킷 키에서 자동 파생됩니다.
> 클라이언트와 서버 모두 동일한 패킷 키를 보유하므로 별도 설정 필요 없습니다.
