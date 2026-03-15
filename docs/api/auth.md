# 인증

## `login(email, password)`

이메일 + 비밀번호로 로그인합니다. 성공 시 내부 토큰이 자동으로 설정됩니다.

```ts
const auth = await client.login("admin@example.com", "password");
// auth.access_token   — 이후 요청에 자동 사용됨
// auth.refresh_token  — 만료 후 재발급에 사용
// auth.expires_in     — 만료까지 남은 초
```

## `refreshToken(refreshToken)`

Refresh Token으로 Access Token을 재발급받습니다.
앱이 명시적으로 호출해야 하며, 성공하면 내부 `this.token`을 새 Access Token으로 교체합니다.

> **패키지는 401을 감지해 자동으로 `refreshToken()`을 호출하지 않습니다.**
> 401 발생 시 앱이 직접 catch해서 호출해야 합니다.

```ts
const result = await client.refreshToken(auth.refresh_token);
// 성공 → this.token이 result.access_token으로 교체됨
// result.access_token
// result.expires_in
```

## `logout(refreshToken)`

서버에 로그아웃을 요청하고 내부 토큰을 초기화합니다.
Refresh Token을 서버에 전달해 무효화하므로 해당 토큰으로 더 이상 재발급이 불가능합니다.
Refresh Token이 이미 만료된 경우에도 서버는 성공으로 응답합니다.

```ts
await client.logout(auth.refresh_token);
// 이후 client 내부 token = "" 으로 초기화됨
```

## 토큰 만료 처리

**패키지가 자동으로 처리하는 것:**

| 동작                  | 내부 토큰 갱신 |
| --------------------- | -------------- |
| `login()` 성공        | ✅ 자동 세팅   |
| `refreshToken()` 성공 | ✅ 자동 교체   |
| `logout()` 호출       | ✅ `""` 초기화 |

**패키지가 처리하지 않는 것:**

- **401 자동 재시도 없음**: access_token이 만료되어 서버가 401을 반환하면 패키지는 에러를 throw합니다. 앱이 직접 잡아서 `refreshToken()`을 호출하고 재시도해야 합니다.
- **토큰 영속성 없음**: 페이지 새로고침 시 싱글톤 인스턴스가 초기화되어 내부 token이 `""` 로 리셋됩니다. 앱이 직접 복원 후 `setToken()` 또는 `configure({ token })` 으로 재세팅해야 합니다.

**401 발생 후 앱의 처리 흐름:**

```
API 요청 → 401 응답 → entityServer.refreshToken(refresh_token) 호출
                              ↓ 성공              ↓ 실패 (refresh_token도 만료)
               setToken(new_access_token)      로그인 페이지로 이동
               원래 요청 재시도
```

**주의:** `refreshToken()`이 성공해 패키지 내부 토큰이 교체되더라도, 앱 내 다른 HTTP 클라이언트(axios 등)에는 별도로 토큰을 전달해야 합니다.

## `keepSession` — 세션 유지 (Silent Refresh)

`keepSession: true` 옵션 설정 시, `login()` 성공 후 만료 `refreshBuffer`초 전에 패키지 내부 타이머가 자동으로 `refreshToken()`을 호출합니다.
갱신이 성공하면 타이머를 다시 예약해 로그인 상태를 계속 유지합니다.
`logout()` 또는 `stopKeepSession()` 호출 시 타이머가 정리됩니다.

```ts
entityServer.configure({
    keepSession: true,
    refreshBuffer: 60, // 만료 60초 전에 갱신 (기본값)
    onTokenRefreshed: (accessToken, expiresIn) => {
        // 갱신 성공 — 앱 레벨 저장소 업데이트
        localStorage.setItem("auth_access_token", accessToken);
    },
    onSessionExpired: (error) => {
        // refresh_token 만료 등으로 갱신 실패
        console.error("세션 만료:", error);
        window.location.href = "/login";
    },
});

// 이후 login() 하면 타이머 자동 시작
const auth = await entityServer.login(email, password);
// expires_in=3600이면 3540초 후 자동 갱신, 이후 반복
```

**수동으로 타이머 중지:**

```ts
entityServer.stopKeepSession();
```

> **페이지 새로고침 시**: 타이머는 메모리에만 존재하므로 새로고침 시 초기화됩니다.
> `useEntityServer`의 `resumeSession` 옵션을 사용하면 페이지 새로고침 후에도 세션을 자동으로 복원할 수 있습니다.

## OAuth 연동

### `oauthLink(provider, code, state?)`

OAuth 프로바이더를 현재 계정에 연동합니다.

```ts
await client.oauthLink("google", "auth-code-from-callback");
```

### `oauthUnlink(provider)`

OAuth 프로바이더 연동을 해제합니다.

```ts
await client.oauthUnlink("google");
```

### `oauthProviders()`

현재 계정에 연동된 OAuth 프로바이더 목록을 반환합니다.

```ts
const res = await client.oauthProviders();
res.data; // [{ provider: "google", email: "...", linked_at: "..." }]
```

### `oauthTokenRefresh(provider)`

특정 OAuth 프로바이더의 액세스 토큰을 갱신합니다.

```ts
const res = await client.oauthTokenRefresh("google");
res.access_token;
```

## 2단계 인증 (2FA)

### `twoFactorSetup()`

2FA 설정을 시작하고 QR 코드 / 시크릿을 반환합니다.

```ts
const res = await client.twoFactorSetup();
res.qr_url; // QR 코드 URL
res.secret; // TOTP 시크릿
res.setup_token;
```

### `twoFactorSetupVerify(code, setupToken)`

TOTP 코드로 2FA 설정을 완료합니다.

```ts
const res = await client.twoFactorSetupVerify("123456", setupToken);
res.recovery_codes; // 복구 코드 목록
```

### `twoFactorDisable(code)`

2FA를 비활성화합니다.

```ts
await client.twoFactorDisable("123456");
```

### `twoFactorStatus()`

2FA 활성화 여부를 조회합니다.

```ts
const res = await client.twoFactorStatus();
res.enabled; // true | false
```

### `twoFactorVerify(twoFactorToken, code)`

로그인 후 발급된 임시 토큰으로 TOTP 코드를 검증하여 최종 JWT를 발급받습니다.

```ts
const res = await client.twoFactorVerify(twoFactorToken, "123456");
res.access_token;
res.refresh_token;
```

### `twoFactorRecovery(twoFactorToken, recoveryCode)`

복구 코드로 2FA를 우회하여 최종 JWT를 발급받습니다.

```ts
const res = await client.twoFactorRecovery(twoFactorToken, "recovery-code");
res.access_token;
```

### `twoFactorRegenerateRecovery(code)`

복구 코드를 재생성합니다.

```ts
const res = await client.twoFactorRegenerateRecovery("123456");
res.recovery_codes;
```

## 계정 관리

### `me()`

현재 로그인된 사용자 정보를 반환합니다.

```ts
const res = await client.me();
res.data; // 계정 정보
```

### `changePassword(currentPasswd, newPasswd)`

비밀번호를 변경합니다.

```ts
await client.changePassword("current-pw", "new-pw");
```

### `withdraw(passwd?)`

회원 탈퇴를 요청합니다.

```ts
await client.withdraw("current-pw");
```

### `reactivate(params)`

휴면 계정을 재활성화합니다.

```ts
const auth = await client.reactivate({
    email: "user@example.com",
    passwd: "password",
});
```

### `passwordResetRequest(email)`

비밀번호 재설정 메일을 요청합니다. 인증 불필요 (공개 API).

```ts
await client.passwordResetRequest("user@example.com");
```

### `passwordResetConfirm(token, newPasswd)`

이메일로 전달된 토큰으로 비밀번호를 재설정합니다. 인증 불필요 (공개 API).

```ts
await client.passwordResetConfirm("reset-token", "new-password");
```
