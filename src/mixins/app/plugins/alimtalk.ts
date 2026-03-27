import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function AlimtalkMixin<
    TBase extends GConstructor<EntityServerClientBase>,
>(Base: TBase) {
    return class AlimtalkMixinClass extends Base {
        /** 알림톡을 발송합니다. */
        alimtalkSend<T = unknown>(body: Record<string, unknown>): Promise<T> {
            return this.http.post("/v1/alimtalk/send", body);
        }

        /** 알림톡 발송 상태를 조회합니다. */
        alimtalkStatus<T = unknown>(seq: number): Promise<T> {
            return this.http.get(
                `/v1/alimtalk/status/${seq}`,
                false,
            );
        }

        /** 알림톡 템플릿 목록을 조회합니다. */
        listAlimtalkTemplates<T = unknown>(): Promise<T> {
            return this.http.get(
                "/v1/alimtalk/templates",
                false,
            );
        }

        /** 알림톡 웹훅을 수신합니다. */
        alimtalkWebhook<T = unknown>(
            provider: string,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/alimtalk/webhook/${encodeURIComponent(provider)}`,
                body,
                false,
            );
        }
    };
}
