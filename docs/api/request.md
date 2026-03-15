# 범용 HTTP 요청

`EntityServerClient`에서 제공하지 않는 커스텀 라우트(go서버·앱서버 신규 엔드포인트 등)를 직접 호출할 때 사용합니다.
인증 헤더, 패킷 암호화, HMAC 서명 등은 기존 SDK 옵션 그대로 자동 적용됩니다.

---

## `requestJson<T>(method, path, body?, withAuth?, extraHeaders?)`

JSON 요청·응답의 범용 메서드입니다.

- 응답이 `application/json`이면 파싱하여 반환합니다.
- 응답이 `application/octet-stream`이면 패킷 복호화 후 반환합니다.
- `ok` 필드 강제 없음 — go서버처럼 자유 응답 포맷을 그대로 반환합니다.
- `encryptRequests: true`이면 요청 바디도 자동 암호화됩니다.

| 파라미터       | 타입                     | 기본값 | 설명                      |
| -------------- | ------------------------ | ------ | ------------------------- |
| `method`       | `string`                 |        | `"GET"`, `"POST"` 등      |
| `path`         | `string`                 |        | `/api/v1/...` 형태의 경로 |
| `body`         | `unknown`                | —      | 요청 바디 (GET이면 생략)  |
| `withAuth`     | `boolean`                | `true` | `Authorization` 헤더 포함 |
| `extraHeaders` | `Record<string, string>` | —      | 추가 헤더                 |

```ts
// GET — 인증 없이
const res = await client.requestJson<{ version: string }>(
    "GET",
    "/api/v1/status",
    undefined,
    false,
);
console.log(res.version);

// POST — 인증 포함, 암호화 자동 적용
const res = await client.requestJson<{ distance_nm: number }>(
    "POST",
    "/api/v1/distance-server/route",
    { from: [37.5665, 126.978], to: [35.1796, 129.0756] },
);
console.log(res.distance_nm);

// 추가 헤더
const res = await client.requestJson<MyResponse>(
    "POST",
    "/api/v1/custom/endpoint",
    { key: "value" },
    true,
    { "X-Custom-Header": "value" },
);
```

---

## `requestBinary(method, path, body?, withAuth?)`

바이너리(ArrayBuffer) 응답을 그대로 반환합니다.
이미지, PDF, 압축 파일 등 바이너리 스트림이 오는 엔드포인트에 사용합니다.

```ts
const buffer = await client.requestBinary("GET", "/api/v1/export/report.pdf");

// Blob 변환 후 다운로드
const blob = new Blob([buffer], { type: "application/pdf" });
const url = URL.createObjectURL(blob);
```

---

## `requestForm<T>(method, path, form, withAuth?)`

`multipart/form-data` 요청을 보내고 JSON 응답을 반환합니다.
파일과 일반 필드를 함께 전송해야 하는 커스텀 엔드포인트에 사용합니다.

```ts
const form = new FormData();
form.append("file", fileBlob, "document.pdf");
form.append("category", "report");

const res = await client.requestForm<{ ok: boolean; seq: number }>(
    "POST",
    "/api/v1/custom/upload",
    form,
);
console.log(res.seq);
```

---

## `requestFormBinary(method, path, form, withAuth?)`

`multipart/form-data` 요청을 보내고 바이너리(ArrayBuffer)를 반환합니다.
업로드 후 처리된 파일(변환·압축 등)을 바이너리로 받을 때 사용합니다.

```ts
const form = new FormData();
form.append("image", imageBlob, "photo.jpg");

const processedBuffer = await client.requestFormBinary(
    "POST",
    "/api/v1/custom/image-process",
    form,
);
```

---

## 내부 메서드와의 차이

SDK 내부에서 엔티티 API를 호출할 때는 `ok: true` 강제 검사가 있는 `_request()`를 사용합니다.
외부에서 커스텀 엔드포인트를 호출할 때는 위의 public 메서드를 사용하세요.

| 메서드              | public | `ok` 강제 | 암호화 | 용도                          |
| ------------------- | ------ | --------- | ------ | ----------------------------- |
| `requestJson`       | ✅     | ❌        | ✅     | 커스텀 라우트 (JSON)          |
| `requestBinary`     | ✅     | ❌        | ❌     | 커스텀 라우트 (바이너리)      |
| `requestForm`       | ✅     | ✅        | ❌     | 커스텀 라우트 (form)          |
| `requestFormBinary` | ✅     | ❌        | ❌     | 커스텀 라우트 (form→바이너리) |
