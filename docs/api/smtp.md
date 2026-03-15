# SMTP 메일

## `smtpSend(req)`

SMTP를 통해 이메일을 발송합니다.

| 필드      | 타입       | 설명                         |
| --------- | ---------- | ---------------------------- |
| `to`      | `string`   | 수신 이메일 주소             |
| `subject` | `string`   | 이메일 제목                  |
| `html`    | `string`   | HTML 본문                    |
| `text`    | `string`   | 텍스트 본문 (HTML 대체)      |
| `from`    | `string`   | 발신 주소 (미지정 시 설정값) |
| `cc`      | `string[]` | 참조 수신자 목록             |
| `bcc`     | `string[]` | 숨은 참조 수신자 목록        |

```ts
const res = await client.smtpSend({
    to: "user@example.com",
    subject: "가입을 환영합니다!",
    html: "<h1>안녕하세요</h1><p>가입해주셔서 감사합니다.</p>",
});
res.seq; // 발송 로그 seq
```

## `smtpStatus(seq)`

SMTP 발송 로그의 처리 상태를 조회합니다.

```ts
const res = await client.smtpStatus(5);
res.status; // "sent" | "failed" | "pending"
```
