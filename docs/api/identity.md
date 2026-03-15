# 본인인증

## `identityRequest(opts)`

본인인증 세션을 생성합니다.

```ts
const res = await client.identityRequest({
    redirect_url: "https://example.com/identity/callback",
    method: "pass",
});
res.data; // { request_id: "...", auth_url: "..." } 등
```

## `identityResult(requestId)`

본인인증 결과를 조회합니다. 콜백 처리 후 호출합니다.

```ts
const res = await client.identityResult("request-id-here");
res.data; // { name, phone, birth, gender, di, ci, ... }
```

## `identityVerifyCI(ciHash)`

CI(연계정보) 해시로 기존 계정 중복 여부를 확인합니다.

```ts
const res = await client.identityVerifyCI("ci-hash-string");
res.data.exists; // true: 이미 가입된 계정 존재
res.data.account_seq; // 존재할 경우 해당 계정 seq
```
