import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function TaxinvoiceMixin<
    TBase extends GConstructor<EntityServerClientBase>,
>(Base: TBase) {
    return class TaxinvoiceMixinClass extends Base {
        /** 전자세금계산서를 즉시 등록·발행합니다. */
        taxinvoiceRegistIssue<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/taxinvoice", body);
        }

        /** 전자세금계산서를 임시 등록합니다. */
        taxinvoiceRegister<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/taxinvoice/register", body);
        }

        /** 임시 저장된 전자세금계산서를 발행합니다. */
        taxinvoiceIssue<T = unknown>(seq: number): Promise<T> {
            return this.http.post(`/v1/taxinvoice/${seq}/issue`, {});
        }

        /** 전자세금계산서 발행을 취소합니다. */
        taxinvoiceCancelIssue<T = unknown>(
            seq: number,
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/taxinvoice/${seq}/cancel`,
                body,
            );
        }

        /** 전자세금계산서 국세청 전송 상태를 조회합니다. */
        taxinvoiceGetState<T = unknown>(seq: number): Promise<T> {
            return this.http.get(`/v1/taxinvoice/${seq}/state`);
        }

        /** 전자세금계산서 상세 정보를 조회합니다. */
        taxinvoiceGetDetail<T = unknown>(seq: number): Promise<T> {
            return this.http.get(`/v1/taxinvoice/${seq}`);
        }
    };
}
