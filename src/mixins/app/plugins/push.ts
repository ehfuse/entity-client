import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function AppPushMixin<
    TBase extends GConstructor<EntityServerClientBase>,
>(Base: TBase) {
    return class AppPushMixinClass extends Base {
        /** 단일 계정에 푸시 알림을 발송합니다. */
        appPushSend<T = unknown>(body: Record<string, unknown>): Promise<T> {
            return this.http.post("/v1/push/send", body);
        }

        /** 다중 계정에 푸시 알림을 브로드캐스트합니다. */
        appPushBroadcast<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/push/broadcast", body);
        }

        /** 푸시 발송 상태를 조회합니다. */
        appPushStatus<T = unknown>(seq: number): Promise<T> {
            return this.http.get(`/v1/push/status/${seq}`);
        }

        /** 디바이스 토큰을 등록/갱신합니다. */
        appPushRegisterDevice<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/push/device", body);
        }

        /** 디바이스 푸시 수신을 비활성화합니다. */
        appPushUnregisterDevice<T = unknown>(seq: number): Promise<T> {
            return this.http.delete(`/v1/push/device/${seq}`);
        }
    };
}
