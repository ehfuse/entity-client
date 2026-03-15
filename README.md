# entity-server-client

Entity Server API를 TypeScript/JavaScript 런타임에서 사용할 수 있는 클라이언트 패키지입니다.

## 프로젝트 관계

- [`create-entity-server`](https://www.npmjs.com/package/create-entity-server): Entity Server 프로젝트를 생성/초기화하는 설치 도구
- [`entity-server`](https://github.com/ehfuse/entity-server): 생성된 프로젝트에서 실행되는 API 서버 런타임
- `entity-server-client`(이 패키지): 위 `entity-server` API를 앱(웹/Node/Bun/Deno/React)에서 호출할 때 사용하는 클라이언트 SDK

즉, `create-entity-server`로 서버 프로젝트를 만들고, 실제 서비스 코드에서는 `entity-server-client`로 해당 `entity-server`에 접속해 데이터를 조회/저장합니다.

## 특징

- 엔티티 CRUD / Query / History / Rollback 지원
- 조건 기반 단건 조회(`find`) — data 전체 복호화 반환
- 트랜잭션 시작/커밋/롤백 지원
- 패킷 암호화(`application/octet-stream`) 자동 복호화 지원
- 푸시 알림 디바이스 등록/갱신/비활성화 지원
- React 전용 훅(`entity-server-client/react`) 제공

## 설치

```bash
npm install entity-server-client
```

React 훅까지 사용할 경우:

```bash
npm install react
```

## 빠른 시작

```ts
import { entityServer } from "entity-server-client";

entityServer.configure({
    baseUrl: import.meta.env.VITE_ENTITY_SERVER_URL,
    token: localStorage.getItem("auth_access_token") ?? "",
});

const res = await entityServer.list("account", { page: 1, limit: 20 });
console.log(res.data);
```

## React 훅

```tsx
import { useEntityServer } from "entity-server-client/react";

export function AccountPage() {
    const { client, submit, del, isPending, error } = useEntityServer({
        tokenResolver: () => localStorage.getItem("auth_access_token"),
    });

    const [items, setItems] = useState([]);

    const load = async () => {
        const res = await client.list("account", { page: 1, limit: 20 });
        setItems(res.data.items);
    };

    const save = async () => {
        await submit("account", {
            name: "홍길동",
            email: "hong@example.com",
        });
    };

    const remove = async (seq: number) => {
        await del("account", seq);
    };

    return (
        <div>
            {isPending && <span>저장 중...</span>}
            {error && <span>{error.message}</span>}
            <button onClick={load}>불러오기</button>
            <button onClick={save} disabled={isPending}>
                저장
            </button>
        </div>
    );
}
```

> `useEntityServer`는 기본적으로 전역 `entityServer` 인스턴스를 사용합니다.  
> `submit` / `del` / `query` 호출 시 `isPending`, `error` 상태가 자동으로 관리됩니다.  
> 컴포넌트마다 독립 인스턴스가 필요하면 `singleton: false` 옵션을 사용하세요.

## Packet 코어

`entity-server-client`는 HTTP 클라이언트뿐 아니라 패킷 암복호 프로토콜 코어도 함께 제공합니다.
브라우저 프론트, Node.js 서비스, `entity-app-server` 같은 중간 계층이 동일한 패킷 포맷을 공유해야 할 때 사용합니다.

```ts
import {
    derivePacketKey,
    packetMagicLenFromKey,
    encryptPacket,
    decryptPacket,
} from "entity-server-client/packet";

const key = derivePacketKey("anon.v1.example-token");
const magicLen = packetMagicLenFromKey(key);

const encrypted = encryptPacket(
    new TextEncoder().encode(JSON.stringify({ ok: true })),
    key,
);

const plaintext = decryptPacket(encrypted, key);
console.log(magicLen, new TextDecoder().decode(plaintext));
```

용도는 다음처럼 구분하는 것이 좋습니다.

- `entity-server-client`: 요청 전송, 응답 복호화, 인증/헬스체크를 포함한 SDK
- `entity-server-client/packet`: 순수 패킷 프로토콜 코어

서버 프레임워크 훅, 쿠키 처리, Fastify 요청/응답 주입 같은 로직은 이 서브패스에 두지 않고 각 서버 런타임에서 따로 구현해야 합니다.

## 문서

- [함수별 사용법](docs/apis.md)
- [React 전용 가이드](docs/react.md)
