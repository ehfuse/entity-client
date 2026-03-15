# PG 결제

결제 라이프사이클: `pgCreateOrder` → (사용자 결제 진행) → `pgConfirmPayment` → (`pgSyncPayment` | `pgCancelPayment`)

## `pgCreateOrder(req)`

결제 주문을 생성합니다. 결제 전 서버에 주문 정보를 등록합니다.

| 필드            | 타입     | 설명                    |
| --------------- | -------- | ----------------------- |
| `orderId`       | `string` | 가맹점 주문 ID (고유값) |
| `amount`        | `number` | 결제 금액 (원 단위)     |
| `orderName`     | `string` | 주문명                  |
| `customerName`  | `string` | 구매자 이름             |
| `customerEmail` | `string` | 구매자 이메일           |

```ts
const order = await client.pgCreateOrder({
    orderId: "order-2026-001",
    amount: 15000,
    orderName: "상품 A",
    customerName: "홍길동",
    customerEmail: "hong@example.com",
});
order.paymentKey; // 결제창 호출에 필요한 키
```

## `pgGetOrder(orderId)`

주문 정보를 조회합니다.

```ts
const order = await client.pgGetOrder("order-2026-001");
order.status; // "pending" | "paid" | "cancelled" ...
order.amount;
order.paymentKey;
```

## `pgConfirmPayment(req)`

결제 완료 후 서버 측 승인 처리를 합니다. PG사에서 발급된 `paymentKey`와 금액으로 검증합니다.

| 필드         | 타입     | 설명                                   |
| ------------ | -------- | -------------------------------------- |
| `paymentKey` | `string` | PG사 결제 키 (클라이언트에서 수신)     |
| `orderId`    | `string` | 가맹점 주문 ID                         |
| `amount`     | `number` | 결제 금액 (주문 금액과 불일치 시 에러) |

```ts
const result = await client.pgConfirmPayment({
    paymentKey: "toss_paymentKey_abc",
    orderId: "order-2026-001",
    amount: 15000,
});
result.status; // "paid"
```

## `pgCancelPayment(paymentKey, req?)`

결제를 취소(환불)합니다.

```ts
// 전액 취소
await client.pgCancelPayment("toss_paymentKey_abc");

// 부분 취소
await client.pgCancelPayment("toss_paymentKey_abc", {
    cancelReason: "고객 요청",
    cancelAmount: 5000,
});
```

## `pgSyncPayment(paymentKey)`

PG사의 실시간 결제 상태를 서버 DB에 동기화합니다.

```ts
const result = await client.pgSyncPayment("toss_paymentKey_abc");
result.status; // 동기화 후 상태
```

## `pgConfig()`

설정된 PG 정보를 조회합니다. 클라이언트 측 결제창 초기화에 필요한 `clientKey` 등을 포함합니다.

```ts
const config = await client.pgConfig();
config.provider; // "toss" | ...
config.clientKey; // 결제창 초기화용 키
```
