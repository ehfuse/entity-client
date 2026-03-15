# 푸시 관련

## `push(pushEntity, payload, opts?)`

`submit()`의 별칭입니다. 푸시 관련 엔티티에 데이터를 제출합니다.

```ts
await client.push("push_message", {
    title: "새 알림",
    body: "내용",
    account_seq: 1,
});
```

## `pushLogList(params?)`

`push_log` 엔티티의 목록을 조회합니다. `list()`의 별칭입니다.

```ts
const logs = await client.pushLogList({
    page: 1,
    limit: 30,
    orderBy: "-created_time",
    conditions: { account_seq: 1 },
});
logs.data.items;
logs.data.total;
```

## `registerPushDevice(accountSeq, deviceId, pushToken, opts?)`

`account_device` 엔티티에 디바이스를 등록합니다.

| 옵션             | 타입      | 설명                              |
| ---------------- | --------- | --------------------------------- |
| `platform`       | `string`  | 플랫폼 (예: `"web"`, `"android"`) |
| `deviceType`     | `string`  | 디바이스 종류 (예: `"mobile"`)    |
| `browser`        | `string`  | 브라우저명 (예: `"Chrome"`)       |
| `browserVersion` | `string`  | 브라우저 버전                     |
| `pushEnabled`    | `boolean` | 푸시 수신 여부. 기본값 `true`     |
| `transactionId`  | `string`  | 트랜잭션 ID                       |

```ts
const res = await client.registerPushDevice(
    1,
    "device-uuid-001",
    "fcm-token-abc",
    {
        platform: "web",
        browser: "Chrome",
        browserVersion: "120",
        pushEnabled: true,
    },
);
res.seq; // 등록된 account_device seq
```

## `updatePushDeviceToken(deviceSeq, pushToken, opts?)`

등록된 디바이스의 푸시 토큰을 갱신합니다.

```ts
await client.updatePushDeviceToken(10, "new-fcm-token", { pushEnabled: true });
```

## `disablePushDevice(deviceSeq, opts?)`

디바이스의 푸시 수신을 비활성화합니다 (`push_enabled: false`).

```ts
await client.disablePushDevice(10);
```

## `pushSend(req)`

특정 계정에 푸시 알림을 직접 발송합니다.

```ts
const res = await client.pushSend({
    account_seq: 1,
    title: "알림 제목",
    body: "알림 내용",
});
res.seq; // 발송 로그 seq
```

## `pushSendAll(req)`

전체 또는 조건에 맞는 모든 사용자에게 푸시 알림을 발송합니다.

```ts
const res = await client.pushSendAll({
    title: "공지사항",
    body: "전체 공지 내용입니다.",
});
res.sent; // 발송 성공 수
res.failed; // 발송 실패 수
```

## `pushStatus(seq)`

푸시 발송 로그의 처리 상태를 조회합니다.

```ts
const res = await client.pushStatus(42);
res.status; // "sent" | "failed" | "pending" 등
```
