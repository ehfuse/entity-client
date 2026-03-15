# QR코드 / 바코드

## `qrcode(content, opts?)`

QR 코드 PNG를 생성합니다. `ArrayBuffer`를 반환합니다.

| 옵션     | 타입     | 설명                              |
| -------- | -------- | --------------------------------- |
| `size`   | `number` | 이미지 크기 (px). 기본값 `256`    |
| `level`  | `string` | 오류 정정 레벨 `L \| M \| Q \| H` |
| `format` | `string` | 출력 포맷. 기본값 `"png"`         |

```ts
const buf = await client.qrcode("https://example.com", { size: 300 });
const blob = new Blob([buf], { type: "image/png" });
img.src = URL.createObjectURL(blob);
```

## `qrcodeBase64(content, opts?)`

QR 코드를 base64 / data URI JSON으로 반환합니다.

```ts
const res = await client.qrcodeBase64("https://example.com");
res.data_uri; // "data:image/png;base64,..."
res.data; // base64 문자열
img.src = res.data_uri;
```

## `qrcodeText(content, opts?)`

QR 코드를 ASCII 아트 텍스트로 반환합니다.

```ts
const res = await client.qrcodeText("https://example.com");
console.log(res.text); // ASCII 아트 QR 코드
```

## `barcode(content, opts?)`

바코드 PNG를 생성합니다. `ArrayBuffer`를 반환합니다.

| 옵션   | 타입     | 설명                                               |
| ------ | -------- | -------------------------------------------------- |
| `type` | `string` | 바코드 형식. 예: `"code128"`, `"ean13"`, `"qr"` 등 |
| `size` | `number` | 이미지 크기                                        |

```ts
const buf = await client.barcode("1234567890128", { type: "ean13" });
const blob = new Blob([buf], { type: "image/png" });
img.src = URL.createObjectURL(blob);
```
