# 엔티티 CRUD / 조회

## `get(entity, seq, opts?)`

시퀀스 ID로 엔티티 단건을 조회합니다.

| 옵션        | 타입      | 설명                                      |
| ----------- | --------- | ----------------------------------------- |
| `skipHooks` | `boolean` | `true`이면 `after_get` 훅을 실행하지 않음 |

```ts
const result = await client.get<Account>("account", 1);
result.data; // Account 타입 객체
```

---

## `find(entity, conditions?, opts?)`

조건(conditions)으로 첫 번째 일치 레코드를 조회합니다.  
`data` 컬럼을 **항상 완전히 복호화**하여 반환합니다. 레코드가 없으면 `404` 에러가 됩니다.

| 파라미터     | 타입                      | 설명                                |
| ------------ | ------------------------- | ----------------------------------- |
| `conditions` | `Record<string, unknown>` | 검색 조건 (인덱스 필드만 조건 가능) |
| `skipHooks`  | `boolean`                 | `true`이면 훅 실행 건너뛰기         |

```ts
// 이메일로 계정 단건 조회
const result = await client.find<Account>("account", {
    email: "hong@example.com",
});
result.data; // Account 전체 필드 (passwd 포함)

// skipHooks 옵션
const result = await client.find<Account>(
    "account",
    { code: "A001" },
    { skipHooks: true },
);
```

> **`get` vs `find`**
>
> - `get(entity, seq)`: seq(일련번호)를 정확히 알고 있을 때 빠르게 조회
> - `find(entity, conditions)`: 조건으로 검색, 항상 data 전체 복호화 반환

---

## `list(entity, params?)`

페이지네이션/정렬/필터 조건으로 엔티티 목록을 조회합니다.

| 파라미터     | 타입                      | 기본값  | 설명                                                |
| ------------ | ------------------------- | ------- | --------------------------------------------------- |
| `page`       | `number`                  | `1`     | 페이지 번호                                         |
| `limit`      | `number`                  | `20`    | 페이지당 레코드 수 (최대 1000)                      |
| `orderBy`    | `string`                  | —       | 정렬 기준 필드명. `-` 접두사로 내림차순 지정 가능   |
| `orderDir`   | `"ASC" \| "DESC"`         | `"ASC"` | 정렬 방향 (`orderBy: "-field"`와 동일 효과)         |
| `fields`     | `string[]`                | —       | 반환할 필드 목록 (**미지정 시 인덱스 필드만 반환**) |
| `conditions` | `Record<string, unknown>` | —       | 필터 조건                                           |

### `fields` — 반환 필드 지정

`fields`는 `entity.json`의 `index`로 선언된 필드명만 지정할 수 있습니다.
존재하지 않는 필드를 지정하면 서버 에러가 발생합니다.

| 값                  | 설명                                                           |
| ------------------- | -------------------------------------------------------------- |
| 미지정 (기본값)     | 인덱스 선언 필드만 반환. **복호화를 건너뛰어 가장 빠름**       |
| `["*"]`             | 전체 필드 반환 (복호화 수행)                                   |
| `["name", "email"]` | 지정한 인덱스 필드만 반환. 모두 인덱스 필드면 역시 복호화 생략 |

> `seq`, `created_time`, `updated_time`, `license_seq`는 `fields` 지정 여부와 무관하게 항상 포함됩니다.

### `conditions` — 필터 조건

인덱스 테이블의 필드(`index` / `hash` / `unique`로 선언된 필드)에만 조건을 걸 수 있습니다.
인덱스에 없는 필드로 필터를 걸면 동작하지 않거나 에러가 발생합니다.

```ts
// 기본값 (인덱스 필드만, 가장 빠름)
const result = await client.list("account");
result.data.items; // 레코드 배열
result.data.total; // 필터 조건 일치 전체 건수
result.data.page; // 현재 페이지
result.data.limit; // 페이지당 레코드 수

// 정렬 + 필터 + 필드 선택
const result = await client.list("account", {
    page: 1,
    limit: 20,
    orderBy: "created_time",
    orderDir: "DESC",
    fields: ["seq", "name", "email"], // index 필드만 → 복호화 생략
    conditions: { status: "active" },
});

// 전체 필드 반환 (fields: ["*"])
const full = await client.list("account", {
    fields: ["*"],
    conditions: { status: "active" },
});

// orderBy에 - 접두사로 내림차순 (orderDir: "DESC"와 동일)
const desc = await client.list("account", { orderBy: "-created_time" });
```

---

## `count(entity, conditions?)`

레코드 건수를 조회합니다. `conditions`는 `list()`와 동일한 필터 규칙을 따릅니다.

```ts
const total = await client.count("account");
total.count; // 전체 건수

const active = await client.count("account", { status: "active" });
active.count; // 조건 일치 건수
```

---

## `query(entity, req)`

커스텀 SQL로 엔티티를 조회합니다.

**제약사항**:

- SELECT 쿼리만 허용 (INSERT/UPDATE/DELETE 불가)
- 인덱스 테이블(`entity_idx_*`)만 접근 가능. 암호화된 본문 필드는 조회 불가
- `SELECT *` 불가. 인덱스 선언 필드만 SELECT 가능
- 최대 반환 건수: 1000

`entity`는 URL 라우트 경로용 기본 엔티티명으로, 실제 조회 대상은 SQL에서 결정됩니다.

| 필드     | 타입        | 설명                                            |
| -------- | ----------- | ----------------------------------------------- |
| `sql`    | `string`    | SELECT SQL문. 사용자 입력은 반드시 `?`로 바인딩 |
| `params` | `unknown[]` | `?` 플레이스홀더에 바인딩할 값 배열             |
| `limit`  | `number`    | 최대 반환 건수 (최대 1000)                      |

응답: `{ ok: true, data: { items: T[], count: number } }`

```ts
// 단일 엔티티
const result = await client.query("account", {
    sql: "SELECT seq, name, email FROM account WHERE status = ?",
    params: ["active"],
    limit: 50,
});
result.data.items; // 레코드 배열
result.data.count; // 반환된 건수

// JOIN으로 여러 엔티티 조합
const joined = await client.query("order", {
    sql: `
        SELECT o.seq, o.status, u.name AS user_name, u.email
        FROM order o
        JOIN account u ON u.data_seq = o.account_seq
        WHERE o.status = ?
        ORDER BY o.seq DESC
    `,
    params: ["pending"],
    limit: 100,
});
```

> SQL Injection 방지: 사용자 입력값은 반드시 `params`로 바인딩하세요.

---

## `submit(entity, data, opts?)`

엔티티를 생성 또는 수정합니다.

- `data`에 `seq`가 **없으면** INSERT
- `data`에 `seq`가 **있으면** UPDATE
- `unique` 선언 필드 기준 중복 감지 시 자동 UPDATE (upsert)

응답의 `seq`는 생성/수정된 레코드의 시퀀스 ID입니다.

| 옵션            | 타입      | 설명                                                              |
| --------------- | --------- | ----------------------------------------------------------------- |
| `transactionId` | `string`  | 수동 트랜잭션 ID. 미지정 시 활성 트랜잭션 자동 사용               |
| `skipHooks`     | `boolean` | `true`이면 `before/after_insert`, `before/after_update` 훅 미실행 |

```ts
// INSERT
const res = await client.submit("account", {
    name: "홍길동",
    email: "hong@example.com",
});
res.seq; // 생성된 seq

// UPDATE (seq 포함 시)
await client.submit("account", { seq: 1, name: "홍길순" });

// 훅 없이 저장
await client.submit("account", { name: "테스트" }, { skipHooks: true });

// 트랜잭션 내에서 — seq placeholder 활용
await client.transStart();
const r1 = await client.submit("order", { product_seq: 1, qty: 2 });
// r1.seq → "$tx.0" (commit 후 실제 seq로 치환)
await client.submit("order_item", { order_seq: r1.seq, name: "상품A" });
await client.transCommit();
```

---

## `delete(entity, seq, opts?)`

엔티티를 삭제합니다.

| 옵션            | 타입      | 기본값  | 설명                                                      |
| --------------- | --------- | ------- | --------------------------------------------------------- |
| `hard`          | `boolean` | `false` | `true`이면 완전 삭제. `false`이면 소프트 삭제 (복원 가능) |
| `transactionId` | `string`  | —       | 수동 트랜잭션 ID. 미지정 시 활성 트랜잭션 자동 사용       |
| `skipHooks`     | `boolean` | `false` | `true`이면 `before/after_delete` 훅 미실행                |

> **소프트 삭제 (기본)**: DB에서 제거하지 않고 삭제 표시만 합니다. `rollback()`으로 복원 가능합니다.
> **하드 삭제**: DB에서 완전히 제거됩니다. 복원 불가능합니다.

```ts
// 소프트 삭제 (기본)
const res = await client.delete("account", 2);
res.deleted; // 삭제된 seq

// 하드 삭제
await client.delete("account", 3, { hard: true });
```

---

## `history(entity, seq, params?)`

엔티티 단건의 변경 이력을 조회합니다. `params`는 `page`, `limit`만 지원합니다.

응답 `data.items`의 각 레코드 구조:

| 필드             | 타입           | 설명                                                                                 |
| ---------------- | -------------- | ------------------------------------------------------------------------------------ |
| `seq`            | `number`       | 이력 레코드 seq (`rollback()` 호출 시 사용)                                          |
| `action`         | `string`       | `"INSERT"` \| `"UPDATE"` \| `"DELETE_SOFT"` \| `"DELETE_HARD"` \| `"ROLLBACK"`       |
| `data_snapshot`  | `T \| null`    | **after 통일 모델**: INSERT/UPDATE → 변경 **후** 데이터, DELETE → 삭제 **전** 데이터 |
| `changed_by`     | `number\|null` | 변경한 계정 seq. 시스템 변경이면 `null`                                              |
| `changed_time`   | `string`       | 변경 시각 (ISO 8601)                                                                 |
| `transaction_id` | `string`       | 해당 변경이 속한 트랜잭션 ID. rollback 시 이 ID 기준으로 전체 롤백됨                 |

```ts
const result = await client.history("account", 1, { page: 1, limit: 50 });
result.data.total; // 전체 이력 건수
result.data.items[0].action; // "UPDATE"
result.data.items[0].data_snapshot; // 변경 후 데이터
result.data.items[0].transaction_id; // "TX-20260201-abc123"
```

---

## `rollback(entity, historySeq)`

특정 이력 레코드의 `transaction_id`를 조회해 **해당 트랜잭션 전체**를 롤백합니다.

한 번의 트랜잭션에 여러 엔티티가 변경됐다면 모든 엔티티가 함께 되돌아갑니다.

```ts
// history()로 이력 seq 조회 후 rollback
const hist = await client.history("account", 1);
const targetHistorySeq = hist.data.items[0].seq;
await client.rollback("account", targetHistorySeq);
```
