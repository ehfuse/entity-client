# entity-client

[entity-server](https://github.com/ehfuse/entity-server)(Go/Fiber)와 [entity-app-server](https://github.com/ehfuse/entity-app-server)(Node.js/Fastify)의 모든 라우트를 TypeScript로 래핑한 클라이언트 SDK입니다.

인증 헤더, 패킷 암호화, HMAC 서명, CSRF 토큰, 세션 갱신 등을 자동으로 처리합니다.

---

## 설치

```bash
npm install entity-client
```

---

## 클래스 구성

| 클래스               | 대상 서버                | 포함 기능                                                                 |
| -------------------- | ------------------------ | ------------------------------------------------------------------------- |
| `EntityServerApi`    | entity-server (Go)       | 인증, 엔티티 CRUD, 파일, SMTP, 알림, 트랜잭션, 유틸                       |
| `EntityAppServerApi` | entity-app-server (Node) | 위 전체 + 계정, 게시판, 이메일인증, OAuth, 비밀번호재설정, 2FA + 플러그인 |

`EntityAppServerApi`는 `EntityServerApi`를 상속하므로 entity-server 라우트도 모두 포함합니다.

---

## 빠른 시작

```ts
import { EntityServerApi, EntityAppServerApi } from "entity-client";

// entity-server 전용
const server = new EntityServerApi({ baseUrl: "https://api.example.com" });
await server.login("user@example.com", "password");
const { data } = await server.get("account", 1);

// entity-app-server (앱 라우트 + 플러그인 포함)
const appServer = new EntityAppServerApi({
    baseUrl: "https://app.example.com",
});
await appServer.accountLogin({ id: "user@example.com", password: "password" });
```

### 전역 싱글턴 사용

```ts
import { entityServer, entityAppServer } from "entity-client";

entityServer.configure({ baseUrl: "https://api.example.com" });
entityServer.setToken("access_token");
```

---

## 생성 옵션

```ts
const client = new EntityServerApi({
    baseUrl: "https://api.example.com", // 기본값: VITE_ENTITY_SERVER_URL 환경변수
    token: "access_token",
    hmacSecret: "secret", // HMAC 서명 활성화
    encryptRequests: true, // 요청 바디 패킷 암호화
    csrfEnabled: true, // CSRF 토큰 자동 갱신
    keepSession: true, // access_token 만료 전 자동 갱신
    onTokenRefreshed: (token, expiresIn) => {
        localStorage.setItem("refresh_token", token);
    },
    onSessionExpired: (err) => {
        location.href = "/login";
    },
});
```

---

## entity-server API (EntityServerApi)

### 인증

```ts
// 로그인
const { access_token, refresh_token } = await client.login("id", "pw");

// 토큰 갱신
await client.refreshToken(refresh_token);

// 로그아웃
await client.logout();

// 회원가입
await client.register({ id: "user", password: "pw", name: "홍길동" });

// 비밀번호 변경
await client.changePassword({ current_password: "old", new_password: "new" });
```

### 엔티티 CRUD

```ts
// 단건 조회
const { data } = await client.get<User>("account", seq);

// 목록 조회
const { data } = await client.list<User>("account", {
    page: 1,
    limit: 20,
    conditions: { status: "active" },
    orderBy: "created_at",
    orderDir: "DESC",
});

// 조건 단건 조회
const { data } = await client.find<User>("account", {
    email: "user@example.com",
});

// 생성 / 수정 (seq 없으면 INSERT, 있으면 UPDATE)
const { seq } = await client.submit("account", {
    name: "홍길동",
    email: "a@b.com",
});

// 삭제 (기본: 소프트 삭제)
await client.delete("account", seq);
await client.delete("account", seq, { hard: true }); // 하드 삭제

// 건수 조회
const { count } = await client.count("account", { status: "active" });

// 커스텀 SQL 조회
const { data } = await client.query("account", {
    select: ["seq", "name", "email"],
    where: "status = 'active'",
});

// 변경 이력
const { data } = await client.history("account", seq);
```

### 트랜잭션

```ts
const txId = await client.transStart();
try {
    await client.submit("order", { ...orderData, seq: undefined });
    await client.submit("order_item", { ...itemData }, { transactionId: txId });
    await client.transCommit();
} catch (e) {
    await client.transRollback();
}
```

### 파일

```ts
// 업로드
const { uuid } = await client.fileUpload(file, { entity: "account", seq: 1 });

// 목록
const { data } = await client.fileList({ entity: "account", seq: 1 });

// 삭제
await client.fileDelete(uuid);
```

### SMTP

```ts
await client.smtpSend({
    to: "user@example.com",
    template: "welcome",
    vars: { name: "홍길동" },
});
```

---

## entity-app-server API (EntityAppServerApi)

`EntityServerApi`의 모든 메서드에 더해 아래가 추가됩니다.

### 계정

```ts
await client.accountLogin({ id: "user@example.com", password: "pw" });
await client.accountRegister({ ... });
await client.accountWithdraw({ reason: "탈퇴" });
await client.accountReactivate({ id: "user@example.com", password: "pw" });
```

### 게시판

```ts
// 카테고리
await client.boardCategoryList();
await client.boardCategoryCreate({ name: "공지사항" });

// 게시글
const { data } = await client.boardPostList({ category_seq: 1, page: 1 });
const { seq } = await client.boardPostCreate({
    title: "제목",
    content: "내용",
    category_seq: 1,
});
await client.boardPostUpdate(seq, { title: "수정 제목" });
await client.boardPostDelete(seq);

// 댓글
await client.boardCommentCreate(postSeq, { content: "댓글" });
```

### OAuth

```ts
const { url } = await client.oauthAuthorize({
    provider: "kakao",
    redirect_uri: "...",
});
const { access_token } = await client.oauthCallback({
    provider: "kakao",
    code: "...",
});
```

### 이메일 인증 / 비밀번호 재설정

```ts
await client.emailVerifySend({ email: "user@example.com" });
await client.emailVerifyConfirm({ email: "user@example.com", code: "123456" });

await client.passwordResetRequest({ email: "user@example.com" });
await client.passwordResetConfirm({ token: "...", new_password: "newpw" });
```

### 2FA

```ts
await client.twoFactorSetup();
await client.twoFactorVerify({ code: "123456" });
await client.twoFactorDisable();
```

### 플러그인

| 플러그인            | 메서드 예시                                |
| ------------------- | ------------------------------------------ |
| 알림톡 (Alimtalk)   | `alimtalkSend()`                           |
| 친구톡 (Friendtalk) | `friendtalkSend()`                         |
| SMS                 | `smsSend()`                                |
| 앱 푸시 (FCM)       | `appPushSend()`                            |
| 결제 (PG)           | `pgPaymentRequest()`, `pgPaymentConfirm()` |
| 세금계산서          | `taxinvoiceIssue()`                        |
| OCR                 | `ocrExtract()`                             |
| LLM                 | `llmChat()`                                |
| 신원인증            | `identityVerify()`                         |
| 공휴일              | `holidaysList()`                           |

---

## 커스텀 라우트 직접 호출

SDK에 없는 엔드포인트는 `client.http`를 사용합니다. 인증·암호화가 그대로 적용됩니다.

```ts
// GET
const res = await client.http.get<{ version: string }>("/api/v1/status", false);

// POST
const res = await client.http.post<MyResponse>("/api/v1/custom", {
    key: "value",
});

// PUT / PATCH / DELETE
await client.http.put("/api/v1/resource/1", { name: "updated" });
await client.http.patch("/api/v1/resource/1", { status: "active" });
await client.http.delete("/api/v1/resource/1");

// 추가 헤더
await client.http.post("/api/v1/endpoint", body, true, { "X-Custom": "value" });
```

바이너리·폼 데이터:

```ts
const buffer = await client.requestBinary("GET", "/api/v1/export/report.pdf");

const form = new FormData();
form.append("file", fileBlob, "doc.pdf");
const res = await client.requestForm<{ ok: boolean }>(
    "POST",
    "/api/v1/upload",
    form,
);
```

---

## React 훅

```tsx
import { useEntityServer, useEntityAppServer } from "entity-client/react";

function MyComponent() {
    const { client, submit, del, isPending, error } = useEntityServer();

    const handleSave = async () => {
        await submit("account", { name: "홍길동" });
    };

    const handleDelete = async (seq: number) => {
        await del("account", seq);
    };

    return (
        <button onClick={handleSave} disabled={isPending}>
            {isPending ? "저장 중..." : "저장"}
        </button>
    );
}
```

옵션:

```tsx
// 별도 인스턴스 (singleton=false)
const { client } = useEntityServer({
    singleton: false,
    baseUrl: "https://...",
});

// 세션 복원
const { client } = useEntityServer({
    resumeSession: localStorage.getItem("refresh_token") ?? undefined,
});
```

---

## 패킷 암호화

서버에서 `encryptRequests: true`를 요구하는 경우 클라이언트 옵션에도 동일하게 설정합니다. 요청 바디 암호화와 응답 복호화가 자동으로 처리됩니다.

```ts
const client = new EntityServerApi({
    baseUrl: "https://api.example.com",
    anonymousPacketToken: "shared_secret",
    encryptRequests: true,
});
```

패킷 유틸리티를 직접 사용하려면:

```ts
import { encryptPacket, decryptPacket } from "entity-client/packet";
```

---

## 라이선스

MIT
