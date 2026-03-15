# React Hook

## `useEntityServer(options?)`

React 컴포넌트에서 EntityServerClient를 사용할 때 권장되는 훅입니다.
`submit` / `del` / `query` 의 `isPending`, `error` 상태를 자동으로 관리합니다.

```ts
import { useEntityServer } from "entity-server-client/react";
```

### 옵션

| 옵션               | 타입                                | 기본값 | 설명                                                                                            |
| ------------------ | ----------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `singleton`        | `boolean`                           | `true` | `true`이면 전역 `entityServer` 인스턴스 사용                                                    |
| `baseUrl`          | `string`                            | —      | 서버 주소 (singleton일 때 `configure()` 호출)                                                   |
| `token`            | `string`                            | —      | JWT Access Token                                                                                |
| `tokenResolver`    | `() => string \| undefined \| null` | —      | 렌더 시점에 토큰을 동적으로 주입하는 함수                                                       |
| `keepSession`      | `boolean`                           | —      | 세션 유지 활성화                                                                                |
| `onTokenRefreshed` | `(accessToken, expiresIn) => void`  | —      | 세션 유지 성공 콜백                                                                             |
| `onSessionExpired` | `(error: Error) => void`            | —      | 세션 만료 콜백 (refresh_token 만료 등)                                                          |
| `resumeSession`    | `string`                            | —      | 저장된 refresh_token. 마운트 시 `refreshToken()` 호출해 토큰 복원 + `keepSession` 타이머 재시작 |

### 반환값

| 필드        | 타입                 | 설명                                                  |
| ----------- | -------------------- | ----------------------------------------------------- |
| `client`    | `EntityServerClient` | **모든 API 메서드에 접근 가능한 클라이언트 인스턴스** |
| `isPending` | `boolean`            | `submit` / `del` / `query` 진행 중 여부               |
| `error`     | `Error \| null`      | 마지막 mutation 에러. 성공 또는 `reset()` 시 `null`   |
| `reset`     | `() => void`         | `isPending`, `error` 초기화                           |
| `submit`    | function             | `client.submit()` 래퍼 — 상태 자동 관리               |
| `del`       | function             | `client.delete()` 래퍼 — 상태 자동 관리               |
| `query`     | function             | `client.query()` 래퍼 — 상태 자동 관리                |

> **`client`는 `EntityServerClient` 인스턴스 그대로입니다.**  
> `submit` / `del` / `query` 래퍼는 `isPending` / `error` 상태를 자동 관리해주는 편의 메서드일 뿐이며,  
> 인증, 푸시, 파일, SMS, PG 등 **모든 API**는 `client.메서드명()`으로 직접 호출합니다.

### `client`로 사용 가능한 모든 API

`client`를 통해 아래 모든 섹션의 메서드를 그대로 사용할 수 있습니다.

| 카테고리           | 주요 메서드 (예시)                                                                 | 상세 문서                        |
| ------------------ | ---------------------------------------------------------------------------------- | -------------------------------- |
| 인증               | `login`, `logout`, `register`, `refreshToken`, `oauthLogin`, `enable2FA` …         | [auth.md](auth.md)               |
| 트랜잭션           | `transStart`, `transCommit`, `transRollback`                                       | [transaction.md](transaction.md) |
| 엔티티 CRUD / 조회 | `get`, `find`, `list`, `count`, `query`, `submit`, `delete`, `history`, `rollback` | [entity.md](entity.md)           |
| 푸시               | `pushSend`, `pushSendAll`, `pushStatus`, `registerPushDevice` …                    | [push.md](push.md)               |
| 이메일 인증        | `emailVerificationSend`, `emailVerificationConfirm`, `emailChange`                 | [email.md](email.md)             |
| SMS                | `smsSend`, `smsVerificationSend`, `smsVerificationVerify`                          | [sms.md](sms.md)                 |
| SMTP 메일          | `smtpSend`, `smtpStatus`                                                           | [smtp.md](smtp.md)               |
| 알림톡 / 친구톡    | `alimtalkSend`, `alimtalkTemplates`, `friendtalkSend`                              | [alimtalk.md](alimtalk.md)       |
| PG 결제            | `pgCreateOrder`, `pgConfirmPayment`, `pgCancelPayment`, `pgConfig`                 | [pg.md](pg.md)                   |
| 파일 스토리지      | `fileUpload`, `fileDownload`, `fileDelete`, `fileList`, `fileToken`, `fileUrl`     | [file.md](file.md)               |
| 본인인증           | `identityRequest`, `identityResult`, `identityVerifyCI`                            | [identity.md](identity.md)       |
| QR코드 / 바코드    | `qrcode`, `qrcodeBase64`, `barcode`                                                | [utils.md](utils.md)             |

### 기본 사용 예시

```tsx
import { useEntityServer } from "entity-server-client/react";

function AccountForm() {
    const { submit, del, isPending, error, reset } = useEntityServer();

    const handleSave = async () => {
        reset();
        await submit("account", { name: "홍길동", email: "hong@example.com" });
    };

    const handleDelete = async (seq: number) => {
        await del("account", seq);
    };

    return (
        <div>
            {isPending && <span>저장 중...</span>}
            {error && <span style={{ color: "red" }}>{error.message}</span>}
            <button onClick={handleSave} disabled={isPending}>
                저장
            </button>
            <button onClick={() => handleDelete(1)} disabled={isPending}>
                삭제
            </button>
        </div>
    );
}
```

### 동적 토큰 주입

```tsx
const { submit } = useEntityServer({
    tokenResolver: () => localStorage.getItem("access_token"),
});
```

### 페이지 새로고침 후 세션 복원

`resumeSession`에 저장된 refresh_token을 넘기면 마운트 시 `refreshToken()`을 호출해
새 access_token을 발급받고, `keepSession: true`이면 타이머도 자동 재시작됩니다.

```tsx
// App.tsx 또는 로그인 복원을 담당하는 컴포넌트
export function AppShell() {
    const storedRefreshToken =
        localStorage.getItem("auth_refresh_token") ?? undefined;

    useEntityServer({
        resumeSession: storedRefreshToken,
        keepSession: true,
        onTokenRefreshed: (accessToken) => {
            localStorage.setItem("auth_access_token", accessToken);
        },
        onSessionExpired: () => {
            window.location.href = "/login";
        },
    });

    return <RouterOutlet />;
}
```

마운트 시 `resumeSession`이 있으면:

1. `refreshToken(storedRefreshToken)` 호출 → 서버에서 새 access_token 발급
2. 패키지 내부 `this.token` 자동 교체
3. `onTokenRefreshed` 콜백 호출
4. `keepSession: true`이면 다음 만료 전 타이머 자동 예약
5. 실패 시 `onSessionExpired` 콜백 호출

### 컴포넌트별 독립 인스턴스

```tsx
const { client } = useEntityServer({
    singleton: false,
    baseUrl: "https://other-server.example.com",
});
```
