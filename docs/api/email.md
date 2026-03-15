# 이메일 인증 / 변경

## `emailVerificationSend(email)`

이메일 인증 코드 또는 링크를 발송합니다. 인증 불필요 (공개 API).

```ts
await client.emailVerificationSend("user@example.com");
```

## `emailVerificationConfirm(token)`

이메일로 받은 인증 토큰을 검증합니다. 인증 불필요 (공개 API).

```ts
await client.emailVerificationConfirm("verify-token-from-email");
```

## `emailVerificationStatus()`

현재 로그인된 계정의 이메일 인증 상태를 조회합니다. JWT 필요.

```ts
const res = await client.emailVerificationStatus();
res.verified; // true | false
res.email; // 현재 이메일
```

## `emailChange(newEmail, code?)`

이메일 주소를 변경합니다.

```ts
await client.emailChange("new@example.com");
// 서버 설정에 따라 code가 필요할 수 있음
await client.emailChange("new@example.com", "123456");
```
