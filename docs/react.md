# React 전용 가이드

## import

```ts
import { useEntityServer } from "entity-server-client/react";
```

## 기본 사용

```ts
import { useEntityServer } from "entity-server-client/react";

export function AccountPage() {
  const { client } = useEntityServer({
    tokenResolver: () => localStorage.getItem("auth_access_token"),
  });

  // 예: 버튼 클릭 시 목록 조회
  const onClick = async () => {
    const res = await client.list("account", { page: 1, limit: 20 });
    console.log(res.data);
  };

  return <button onClick={onClick}>불러오기</button>;
}
```

## `client`로 사용 가능한 모든 API

`client`는 `EntityServerClient` 인스턴스 그대로이므로 엔티티 CRUD 외에도 **모든 API**를 호출할 수 있습니다.  
`submit` / `del` / `query` 래퍼는 `isPending` / `error` 상태를 자동 관리해주는 편의 메서드일 뿐입니다.

```tsx
const { client, submit, del } = useEntityServer({
    tokenResolver: () => localStorage.getItem("auth_access_token"),
});

// 인증
await client.login({ email: "hong@example.com", password: "pw" });
await client.logout();

// 트랜잭션
await client.transStart();
await client.submit("order", { product_seq: 1, qty: 2 });
await client.transCommit();

// 파일 업로드
const res = await client.fileUpload("product", file, { refSeq: 10 });

// SMS 인증
await client.smsVerificationSend("01012345678");
await client.smsVerificationVerify("01012345678", "123456");

// 알림톡 발송
await client.alimtalkSend({
    to: "01012345678",
    templateCode: "ORDER_CONFIRM",
    variables: {},
});

// PG 결제
const order = await client.pgCreateOrder({
    orderId: "ord-001",
    amount: 15000,
    orderName: "상품 A",
    customerName: "홍길동",
    customerEmail: "hong@example.com",
});
await client.pgConfirmPayment({
    paymentKey: "key",
    orderId: "ord-001",
    amount: 15000,
});

// 본인인증
const req = await client.identityRequest({
    redirect_url: "https://example.com/callback",
});

// QR코드
const buf = await client.qrcode("https://example.com", { size: 300 });
```

카테고리별 상세 파라미터는 [api/](api/) 폴더의 각 문서를 참고하세요.

## 옵션

### `singleton` (기본: `true`)

- `true`: 패키지 전역 인스턴스(`entityServer`)를 사용
- `false`: 훅 호출 스코프마다 새 인스턴스 생성

```ts
const { client } = useEntityServer({
    singleton: false,
    baseUrl: "http://localhost:47200",
});
```

### `tokenResolver`

렌더 시점에 토큰을 읽어 자동으로 `setToken`을 적용합니다.

```ts
const { client } = useEntityServer({
    tokenResolver: () => sessionStorage.getItem("access_token"),
});
```

### `baseUrl`, `token`

`EntityServerClientOptions`와 동일하게 전달할 수 있습니다.

```ts
const { client } = useEntityServer({
    baseUrl: import.meta.env.VITE_ENTITY_SERVER_URL,
});
```

## React Query와 함께 사용 예시

```ts
import { useQuery } from "@tanstack/react-query";
import { useEntityServer } from "entity-server-client/react";

export function useAccountList() {
    const { client } = useEntityServer({
        tokenResolver: () => localStorage.getItem("auth_access_token"),
    });

    return useQuery({
        queryKey: ["account", "list"],
        queryFn: () => client.list("account", { page: 1, limit: 20 }),
    });
}
```
