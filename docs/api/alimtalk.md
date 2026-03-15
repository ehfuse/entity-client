# 알림톡 / 친구톡

카카오 비즈메시지(알림톡/친구톡)를 발송합니다.

## `alimtalkSend(req)`

카카오 알림톡을 발송합니다. 사전 승인된 템플릿을 사용합니다.

| 필드           | 타입     | 설명                      |
| -------------- | -------- | ------------------------- |
| `to`           | `string` | 수신 전화번호             |
| `templateCode` | `string` | 승인된 알림톡 템플릿 코드 |
| `variables`    | `object` | 템플릿 변수 (키-값 맵)    |

```ts
const res = await client.alimtalkSend({
    to: "01012345678",
    templateCode: "ORDER_CONFIRM",
    variables: {
        orderId: "20260201-001",
        totalAmount: "50,000",
    },
});
res.seq; // 발송 로그 seq
```

## `alimtalkStatus(seq)`

알림톡 발송 처리 상태를 조회합니다.

```ts
const res = await client.alimtalkStatus(7);
res.status; // "sent" | "failed" | "pending"
```

## `alimtalkTemplates()`

등록된 알림톡 템플릿 목록을 조회합니다.

```ts
const res = await client.alimtalkTemplates();
res.items; // 템플릿 배열 [{ code, name, content, ... }]
```

## `friendtalkSend(req)`

카카오 친구톡을 발송합니다. 승인된 채널 친구에게만 발송 가능합니다.

| 필드      | 타입     | 설명                                 |
| --------- | -------- | ------------------------------------ |
| `to`      | `string` | 수신 전화번호                        |
| `type`    | `string` | 메시지 타입 (`"text"`, `"image"` 등) |
| `content` | `string` | 메시지 본문                          |

```ts
const res = await client.friendtalkSend({
    to: "01012345678",
    type: "text",
    content: "안녕하세요! 신상품이 입고되었습니다.",
});
res.seq; // 발송 로그 seq
```
