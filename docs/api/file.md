# 파일 스토리지

## `fileUpload(entity, file, opts?)`

파일을 업로드합니다 (multipart/form-data). `entity`는 파일이 귀속될 엔티티명입니다.

| 옵션       | 타입      | 설명                                      |
| ---------- | --------- | ----------------------------------------- |
| `refSeq`   | `number`  | 연결할 엔티티 레코드 seq                  |
| `isPublic` | `boolean` | `true`이면 인증 없이 URL로 직접 접근 가능 |

```ts
const input = document.querySelector('input[type="file"]') as HTMLInputElement;
const file = input.files![0];

const res = await client.fileUpload("product", file, {
    refSeq: 10,
    isPublic: false,
});
res.uuid; // 파일 고유 UUID
res.data; // FileMeta 객체
res.data.name; // 원본 파일명
res.data.size; // 파일 크기 (bytes)
res.data.mime; // MIME 타입
```

## `fileDownload(entity, uuid)`

파일을 다운로드합니다. `ArrayBuffer`를 반환합니다.

```ts
const buf = await client.fileDownload("product", "uuid-here");
const blob = new Blob([buf], { type: "image/png" });
const url = URL.createObjectURL(blob);
```

## `fileDelete(entity, uuid)`

파일을 삭제합니다.

```ts
await client.fileDelete("product", "uuid-here");
```

## `fileList(entity, opts?)`

엔티티에 연결된 파일 목록을 조회합니다.

```ts
const res = await client.fileList("product", { refSeq: 10 });
res.data.items; // FileMeta[]
res.data.total; // 전체 건수
```

## `fileMeta(entity, uuid)`

파일 메타 정보를 조회합니다.

```ts
const res = await client.fileMeta("product", "uuid-here");
res.data; // FileMeta
```

## `fileToken(uuid)`

임시 파일 접근 토큰을 발급합니다. 비공개 파일을 일시적으로 공유할 때 사용합니다.

```ts
const res = await client.fileToken("uuid-here");
const tempUrl = `${baseUrl}/v1/files/${res.token}`;
```

## `fileUrl(uuid)`

파일 직접 접근 URL을 반환합니다. (fetch 없음, URL 조합만)

```ts
const url = client.fileUrl("uuid-here");
// → "http://localhost:47200/v1/files/uuid-here"
```
