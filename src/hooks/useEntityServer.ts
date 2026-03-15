import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    EntityServerClient,
    entityServer,
    type EntityListParams,
    type EntityQueryRequest,
    type EntityServerClientOptions,
} from "../index";

export interface UseEntityServerOptions extends EntityServerClientOptions {
    singleton?: boolean;
    tokenResolver?: () => string | undefined | null;
    /**
     * 페이지 새로고침 후 로그인 상태를 복원할 때 사용합니다.
     * 이 값이 있으면 마운트 시 `client.refreshToken()`을 호출해 새 access_token을 발급받습니다.
     * `keepSession: true`와 함께 사용하면 세션 유지 타이머도 재시작됩니다.
     * 갱신 성공 시 `onTokenRefreshed` 콜백이 호출됩니다.
     */
    resumeSession?: string;
}

export interface UseEntityServerResult {
    /** EntityServerClient 인스턴스 (read 전용 메서드 직접 호출 시 사용) */
    client: EntityServerClient;
    /** submit 또는 delete 진행 중 여부 */
    isPending: boolean;
    /** 마지막 mutation 에러 (없으면 null) */
    error: Error | null;
    /** 에러·결과 상태 초기화 */
    reset: () => void;
    /** entity 데이터 생성/수정 (seq 없으면 INSERT, 있으면 UPDATE) */
    submit: (
        entity: string,
        data: Record<string, unknown>,
        opts?: { transactionId?: string; skipHooks?: boolean },
    ) => Promise<{ ok: boolean; seq: number }>;
    /** entity 데이터 삭제 */
    del: (
        entity: string,
        seq: number,
        opts?: { transactionId?: string; hard?: boolean; skipHooks?: boolean },
    ) => Promise<{ ok: boolean; deleted: number }>;
    /** 커스텀 SQL 조회 */
    query: <T = unknown>(
        entity: string,
        req: EntityQueryRequest,
    ) => Promise<{ ok: boolean; data: { items: T[]; count: number } }>;
}

/**
 * React 환경에서 EntityServerClient 인스턴스와 mutation 상태를 반환합니다.
 *
 * - `singleton=true`(기본): 패키지 전역 `entityServer` 인스턴스를 사용합니다.
 * - `singleton=false`: 컴포넌트 스코프의 새 인스턴스를 생성합니다.
 *
 * @example
 * ```tsx
 * const { submit, del, isPending, error, reset } = useEntityServer();
 *
 * const handleSave = async () => {
 *     await submit("account", { name: "홍길동" });
 * };
 * ```
 */
export function useEntityServer(
    options: UseEntityServerOptions = {},
): UseEntityServerResult {
    const {
        singleton = true,
        tokenResolver,
        baseUrl,
        token,
        resumeSession,
    } = options;

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // 언마운트 후 setState 방지
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // 새로고침 후 로그인 상태 복원: resumeSession이 있으면 마운트 시 refreshToken() 호출
    const resumeTokenRef = useRef(resumeSession);
    useEffect(() => {
        const storedRefreshToken = resumeTokenRef.current;
        if (!storedRefreshToken) return;
        client.refreshToken(storedRefreshToken).catch(() => {
            // refresh_token 만료 등 — onSessionExpired 콜백이 이미 처리
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const client = useMemo(() => {
        const c = singleton
            ? entityServer
            : new EntityServerClient({ baseUrl, token });

        if (singleton) {
            c.configure({ baseUrl, token });
        }

        const resolvedToken = tokenResolver?.();
        if (typeof resolvedToken === "string") {
            c.setToken(resolvedToken);
        }

        return c;
    }, [singleton, tokenResolver, baseUrl, token]);

    const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
        if (mountedRef.current) {
            setIsPending(true);
            setError(null);
        }
        try {
            const result = await fn();
            return result;
        } catch (err) {
            const e = err instanceof Error ? err : new Error(String(err));
            if (mountedRef.current) setError(e);
            throw e;
        } finally {
            if (mountedRef.current) setIsPending(false);
        }
    }, []);

    const submit = useCallback<UseEntityServerResult["submit"]>(
        (entity, data, opts) => run(() => client.submit(entity, data, opts)),
        [client, run],
    );

    const del = useCallback<UseEntityServerResult["del"]>(
        (entity, seq, opts) => run(() => client.delete(entity, seq, opts)),
        [client, run],
    );

    const query = useCallback<UseEntityServerResult["query"]>(
        (entity, req) => run(() => client.query(entity, req)),
        [client, run],
    );

    const reset = useCallback(() => {
        setIsPending(false);
        setError(null);
    }, []);

    return { client, isPending, error, reset, submit, del, query };
}
