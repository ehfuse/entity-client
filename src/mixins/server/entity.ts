import type {
    EntityHistoryRecord,
    EntityListParams,
    EntityListResult,
    EntityQueryRequest,
} from "../../types.js";
import { buildQuery } from "../../client/utils.js";
import type {
    GConstructor,
    EntityServerClientBase,
} from "../../client/base.js";

export function EntityMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class EntityMixinClass extends Base {
        // ─── 트랜잭션 ─────────────────────────────────────────────────────────

        /** 트랜잭션을 시작하고 활성 트랜잭션 ID를 저장합니다. */
        async transStart(): Promise<string> {
            const res = await this.request<{
                ok: boolean;
                transaction_id: string;
            }>("POST", "/v1/transaction/start", undefined, false);
            this.activeTxId = res.transaction_id;
            return this.activeTxId;
        }

        /** 활성 트랜잭션(또는 전달된 transactionId)을 롤백합니다. */
        transRollback(transactionId?: string): Promise<{ ok: boolean }> {
            const txId = transactionId ?? this.activeTxId;
            if (!txId)
                return Promise.reject(
                    new Error(
                        "No active transaction. Call transStart() first.",
                    ),
                );
            this.activeTxId = null;
            return this.request("POST", `/v1/transaction/rollback/${txId}`);
        }

        /**
         * 활성 트랜잭션(또는 전달된 transactionId)을 커밋합니다.
         *
         * @returns `results` 배열: commit된 각 작업의 `entity`, `action`, `seq`
         */
        transCommit(transactionId?: string): Promise<{
            ok: boolean;
            results: Array<{ entity: string; action: string; seq: number }>;
        }> {
            const txId = transactionId ?? this.activeTxId;
            if (!txId)
                return Promise.reject(
                    new Error(
                        "No active transaction. Call transStart() first.",
                    ),
                );
            this.activeTxId = null;
            return this.request("POST", `/v1/transaction/commit/${txId}`);
        }

        // ─── 엔티티 CRUD ──────────────────────────────────────────────────────

        /** 엔티티 설정 메타데이터를 조회합니다. */
        meta<T = unknown>(entity: string): Promise<{ ok: boolean; data: T }> {
            return this.request("POST", `/v1/entity/${entity}/meta`, {});
        }

        /** 엔티티 데이터를 저장 없이 검증합니다. */
        validate<T = unknown>(
            entity: string,
            data: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(`/v1/entity/${entity}/validate`, data);
        }

        /** 시퀀스 ID로 엔티티 단건을 조회합니다. */
        get<T = unknown>(
            entity: string,
            seq: number,
            opts: { skipHooks?: boolean } = {},
        ): Promise<{ ok: boolean; data: T }> {
            const q = opts.skipHooks ? "?skipHooks=true" : "";
            return this.request("GET", `/v1/entity/${entity}/${seq}${q}`);
        }

        /** 조건으로 엔티티 단건을 조회합니다. data 컬럼을 완전히 복호화하여 반환합니다. */
        find<T = unknown>(
            entity: string,
            conditions?: Record<string, unknown>,
            opts: { skipHooks?: boolean } = {},
        ): Promise<{ ok: boolean; data: T }> {
            const q = opts.skipHooks ? "?skipHooks=true" : "";
            return this.request(
                "POST",
                `/v1/entity/${entity}/find${q}`,
                conditions ?? {},
            );
        }

        /** 페이지네이션/정렬/필터 조건으로 엔티티 목록을 조회합니다. */
        list<T = unknown>(
            entity: string,
            params: EntityListParams = {},
        ): Promise<{ ok: boolean; data: EntityListResult<T> }> {
            const { conditions, fields, orderDir, orderBy, ...rest } = params;
            const queryObj: Record<string, unknown> = {
                page: 1,
                limit: 20,
                ...rest,
            };
            if (orderBy)
                queryObj.orderBy =
                    orderDir === "DESC" ? `-${orderBy}` : orderBy;
            if (fields?.length) queryObj.fields = fields.join(",");
            return this.request(
                "POST",
                `/v1/entity/${entity}/list?${buildQuery(queryObj)}`,
                conditions ?? {},
            );
        }

        /**
         * 엔티티 총 건수를 조회합니다.
         *
         * @param conditions 필터 조건 (예: `{ status: "active" }`)
         */
        count(
            entity: string,
            conditions?: Record<string, unknown>,
        ): Promise<{ ok: boolean; count: number }> {
            return this.request(
                "POST",
                `/v1/entity/${entity}/count`,
                conditions ?? {},
            );
        }

        /**
         * 커스텀 SQL로 엔티티를 조회합니다.
         *
         * SELECT 전용이며 인덱스 테이블만 조회 가능합니다. JOIN 지원.
         */
        query<T = unknown>(
            entity: string,
            req: EntityQueryRequest,
        ): Promise<{ ok: boolean; data: { items: T[]; count: number } }> {
            return this.request("POST", `/v1/entity/${entity}/query`, req);
        }

        /** 엔티티 데이터를 생성/수정(Submit)합니다. `seq`가 없으면 INSERT, 있으면 UPDATE입니다. */
        submit(
            entity: string,
            data: Record<string, unknown>,
            opts: { transactionId?: string; skipHooks?: boolean } = {},
        ): Promise<{ ok: boolean; seq: number }> {
            const txId = opts.transactionId ?? this.activeTxId;
            const extraHeaders = txId
                ? { "X-Transaction-ID": txId }
                : undefined;
            const q = opts.skipHooks ? "?skipHooks=true" : "";
            return this.request(
                "POST",
                `/v1/entity/${entity}/submit${q}`,
                data,
                true,
                extraHeaders,
            );
        }

        /** 시퀀스 ID로 엔티티를 삭제합니다(`hard=true`면 하드 삭제, 기본은 소프트 삭제). */
        delete(
            entity: string,
            seq: number,
            opts: {
                transactionId?: string;
                hard?: boolean;
                skipHooks?: boolean;
            } = {},
        ): Promise<{ ok: boolean; deleted: number }> {
            const params = new URLSearchParams();
            if (opts.hard) params.set("hard", "true");
            if (opts.skipHooks) params.set("skipHooks", "true");
            const q = params.size ? `?${params}` : "";
            const txId = opts.transactionId ?? this.activeTxId;
            const extraHeaders = txId
                ? { "X-Transaction-ID": txId }
                : undefined;
            return this.request(
                "POST",
                `/v1/entity/${entity}/delete/${seq}${q}`,
                undefined,
                true,
                extraHeaders,
            );
        }

        /** 엔티티 단건의 변경 이력을 조회합니다. */
        history<T = unknown>(
            entity: string,
            seq: number,
            params: Pick<EntityListParams, "page" | "limit"> = {},
        ): Promise<{
            ok: boolean;
            data: EntityListResult<EntityHistoryRecord<T>>;
        }> {
            return this.request(
                "GET",
                `/v1/entity/${entity}/history/${seq}?${buildQuery({ page: 1, limit: 50, ...params })}`,
            );
        }

        /** 특정 이력 시점으로 엔티티를 롤백합니다. */
        rollback(entity: string, historySeq: number): Promise<{ ok: boolean }> {
            return this.request(
                "POST",
                `/v1/entity/${entity}/rollback/${historySeq}`,
            );
        }
    };
}
