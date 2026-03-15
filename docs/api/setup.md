# 인스턴스 생성/설정

## `new EntityServerClient(options?)`

| 옵션               | 타입                               | 기본값                             | 설명                                                                                                                                                                                 |
| ------------------ | ---------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `baseUrl`          | `string`                           | `VITE_ENTITY_SERVER_URL` 또는 `""` | 서버 주소                                                                                                                                                                            |
| `token`            | `string`                           | `""`                               | JWT Access Token                                                                                                                                                                     |
| `encryptRequests`  | `boolean`                          | `false`                            | `true` 로 설정하면 인증된 POST/PUT/PATCH 요청 바디를 XChaCha20-Poly1305 로 암호화하여 전송합니다. 서버에서 `requirePacketEncryption = true` 로 설정된 경우 반드시 활성화해야 합니다. |
| `keepSession`      | `boolean`                          | `false`                            | `true`이면 `login()` 성공 후 Access Token 만료 전에 자동으로 갱신합니다.                                                                                                             |
| `refreshBuffer`    | `number`                           | `60`                               | 만료 몇 초 전에 갱신을 시도할지 설정합니다. 예: `expires_in=3600`, `refreshBuffer=60` → 3540초 후 갱신                                                                               |
| `onTokenRefreshed` | `(accessToken, expiresIn) => void` | —                                  | 자동 갱신 성공 시 호출됩니다. 새 `access_token`을 받아 앱 레벨 저장소에 업데이트하세요.                                                                                              |
| `onSessionExpired` | `(error: Error) => void`           | —                                  | 세션 유지 갱신 실패 시 호출됩니다 (refresh_token 만료 등). 로그인 페이지로 이동하는 등의 처리를 여기서 합니다.                                                                       |

```ts
// 직접 생성
const client = new EntityServerClient({
    baseUrl: "https://api.example.com",
    token: "eyJhbGciOi...",
    encryptRequests: true, // 요청 바디 암호화 활성화
});

// 싱글톤 (환경변수 자동 읽기)
import { entityServer } from "entity-server-client";
```

## `configure(options)`

런타임에 설정을 갱신합니다.

```ts
client.configure({
    baseUrl: "https://api.example.com",
    token: "new-access-token",
    encryptRequests: true,
});
```

## `setToken(token)`

```ts
client.setToken("eyJhbGciOi...");
```
