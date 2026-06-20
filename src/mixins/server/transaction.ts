import type {
    GConstructor,
    EntityServerClientBase,
} from "../../client/base.js";

/** transactionSubmit 의 단일 작업. data 안의 "$tx.{i}" 는 i 번째 submit 결과 seq 로 치환됩니다. */
export interface TransactionSubmitOp {
    entity: string;
    action?: "submit" | "delete"; // 기본 "submit"
    data?: Record<string, unknown>; // submit 본문 ("$tx.{i}" placeholder 허용)
    seq?: number; // delete 대상 seq
    hard?: boolean; // delete hard 여부
}

/** transactionSubmit 응답. results 는 op 순서대로 실행 결과(seq 포함). */
export interface TransactionSubmitResult {
    ok: boolean;
    results: Array<{
        index: number;
        entity: string;
        action: "submit" | "delete";
        seq: number;
    }>;
}

export function TransactionMixin<
    TBase extends GConstructor<EntityServerClientBase>,
>(Base: TBase) {
    return class TransactionMixinClass extends Base {
        /** 트랜잭션을 시작하고 transaction_id를 반환합니다. */
        transactionStart<T = unknown>(
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this.request("POST", "/v1/transaction/start", body ?? {});
        }

        /**
         * 여러 엔티티 op 를 큐 없이 단일 DB 트랜잭션으로 한 번에 실행합니다. (start/commit 왕복 없이 1요청)
         *
         * op.data 안에 "$tx.{i}" 문자열을 쓰면 i 번째 submit 결과 seq 로 치환됩니다.
         * 예) 부모-자식 1왕복 생성:
         *   transactionSubmit([
         *     { entity: "stock_order", data: { ...header } },          // op[0]
         *     { entity: "stock_order_item", data: { order_seq: "$tx.0", ... } }, // op[1]
         *   ])
         * 하나라도 실패하면 전체 롤백됩니다.
         */
        transactionSubmit<T = TransactionSubmitResult>(
            ops: TransactionSubmitOp[],
        ): Promise<T> {
            return this.request("POST", "/v1/transaction/submit", { ops });
        }

        /** 지정한 트랜잭션을 커밋합니다. */
        transactionCommit<T = unknown>(transactionId: string): Promise<T> {
            return this.request(
                "POST",
                `/v1/transaction/commit/${encodeURIComponent(transactionId)}`,
                {},
            );
        }

        /** 지정한 트랜잭션을 롤백합니다. */
        transactionRollback<T = unknown>(transactionId: string): Promise<T> {
            return this.request(
                "POST",
                `/v1/transaction/rollback/${encodeURIComponent(transactionId)}`,
                {},
            );
        }
    };
}
