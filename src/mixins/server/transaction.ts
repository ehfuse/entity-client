import type {
    GConstructor,
    EntityServerClientBase,
} from "../../client/base.js";

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
