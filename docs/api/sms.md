# SMS

## `smsSend(req)`

SMS를 직접 발송합니다.

| 필드   | 타입     | 설명                               |
| ------ | -------- | ---------------------------------- |
| `to`   | `string` | 수신 전화번호 (`01012345678` 형식) |
| `text` | `string` | 메시지 내용                        |
| `from` | `string` | 발신 번호 (미지정 시 설정값 사용)  |

```ts
const res = await client.smsSend({
    to: "01012345678",
    text: "안녕하세요. 인증번호는 123456입니다.",
});
res.seq; // 발송 로그 seq
```

## `smsStatus(seq)`

SMS 발송 처리 상태를 조회합니다.

```ts
const res = await client.smsStatus(10);
res.status; // "sent" | "failed" | "pending"
```

## `smsVerificationSend(phone)`

SMS 인증번호를 발송합니다. 인증 불필요 (공개 API).

```ts
await client.smsVerificationSend("01012345678");
```

## `smsVerificationVerify(phone, code)`

발송된 SMS 인증번호를 검증합니다. 인증 불필요 (공개 API).

```ts
const res = await client.smsVerificationVerify("01012345678", "123456");
res.verified; // true | false
```
