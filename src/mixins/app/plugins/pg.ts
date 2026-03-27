import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function PgMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class PgMixinClass extends Base {
        /** 주문을 생성합니다. */
        pgCreateOrder<T = unknown>(body: Record<string, unknown>): Promise<T> {
            return this.http.post("/v1/pg/orders", body);
        }

        /** 주문을 조회합니다. */
        pgGetOrder<T = unknown>(orderId: string): Promise<T> {
            return this.http.get(
                `/v1/pg/orders/${encodeURIComponent(orderId)}`,
            );
        }

        /** 결제를 승인합니다. */
        pgConfirmPayment<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/pg/confirm", body);
        }

        /** 결제를 취소합니다. */
        pgCancelPayment<T = unknown>(
            orderId: string,
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/pg/orders/${encodeURIComponent(orderId)}/cancel`,
                body,
            );
        }

        /** 결제 상태를 동기화합니다. (관리자용) */
        pgSyncPaymentStatus<T = unknown>(
            orderId: string,
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/pg/orders/${encodeURIComponent(orderId)}/sync`,
                body,
            );
        }

        /** PG사 웹훅을 수신합니다. */
        pgWebhook<T = unknown>(body: Record<string, unknown>): Promise<T> {
            return this.http.post("/v1/pg/webhook", body, false);
        }

        /** 클라이언트 SDK 설정을 조회합니다. */
        pgGetClientConfig<T = unknown>(): Promise<T> {
            return this.http.get("/v1/pg/config", false);
        }
    };
}
