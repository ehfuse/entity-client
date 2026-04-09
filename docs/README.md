# entity-client 문서

현재 문서는 /home/ehfuse/npm/entity-client/src 기준으로 정리했습니다.

- [EntityServerApi](./api/entity-server.md): entity-server 코어 라우트와 클라이언트 헬퍼 정리
- [EntityAppServerApi](./api/entity-app-server.md): entity-app-server 전용 라우트와 플러그인 정리

## 문서 보는 법

- `클라이언트 메서드`: SDK에서 직접 호출하는 메서드 이름
- `HTTP`: 실제 요청 메서드. 클라이언트 전용 헬퍼는 `-`로 표시
- `경로`: 실제 호출 경로. 동적 파라미터는 `:param` 형태로 표기
- `비고`: 상속, 래퍼 성격, 주의할 점

## 클래스 관계

- `EntityServerApi`: entity-server 코어 라우트용 SDK
- `EntityAppServerApi`: `EntityServerApi`를 상속하며 app 라우트와 플러그인 라우트를 추가한 SDK

즉 `EntityAppServerApi`를 쓰면 `EntityServerApi`의 모든 메서드를 함께 사용할 수 있습니다.