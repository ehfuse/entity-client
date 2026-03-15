# 트랜잭션

여러 submit/delete를 하나의 DB 트랜잭션으로 묶습니다.
트랜잭션은 **5분 TTL**을 가집니다. 이 안에 commit 또는 rollback을 해야 합니다.

```
transStart → submit/delete (여러 개) → transCommit
                                      └→ transRollback (실패 시)
```

## `transStart()`

트랜잭션을 시작하고 내부 활성 트랜잭션 ID를 저장합니다.
이후 `submit()`/`delete()`는 `X-Transaction-ID` 헤더를 자동 포함합니다.

```ts
const txId = await client.transStart();
```

## `transCommit(transactionId?)`

큐에 쌓인 모든 작업을 단일 DB 트랜잭션으로 일괄 실행합니다.
하나라도 실패하면 전체 ROLLBACK됩니다.

```ts
await client.transStart();
await client.submit("order", { product_seq: 1, qty: 2 });
await client.submit("inventory", { seq: 1, stock: 48 });
const result = await client.transCommit();
// result.results → [{ entity: "order", action: "submit", seq: 55 }, ...]
```

> **트랜잭션 중 submit 응답**: commit 전에는 `{ ok: true, queued: true, seq: "$tx.0" }` 형태의
> placeholder가 반환됩니다. `$tx.0`, `$tx.1` 값은 commit 시 실제 seq로 자동 치환되므로
> 후속 submit의 외래키 값으로 그대로 사용할 수 있습니다.

## `transRollback(transactionId?)`

- 아직 commit 전 (큐에 남아있음): 큐를 버립니다. DB에 아무 변경 없음.
- 이미 commit 후: history 기반으로 전체 되돌립니다.

```ts
try {
    await client.transStart();
    await client.submit("order", { ... });
    await client.transCommit();
} catch (e) {
    await client.transRollback(); // 활성 트랜잭션 자동 참조
}
```
