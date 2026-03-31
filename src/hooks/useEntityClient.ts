import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    type EntityQueryRequest,
    type EntityServerClientOptions,
} from "../index.js";

export interface UseEntityServerOptions extends EntityServerClientOptions {
    singleton?: boolean;
    tokenResolver?: () => string | undefined | null;
    /**
     * 페이지 새로고침 후 로그인 상태를 복원할 때 사용합니다.
     * 값 자체는 더 이상 사용하지 않고, 값이 있으면 마운트 시 `client.checkHealth(true)`로
     * refresh 쿠키 기반 세션 부트스트랩을 시도합니다.
     */
    resumeSession?: string;
}

/** useEntityClient가 요구하는 최소 클라이언트 인터페이스 */
export interface EntityClientShape {
    configure(options: Partial<EntityServerClientOptions>): void;
    setToken(token: string): void;
    checkHealth?: (bootstrapAuth?: boolean) => Promise<unknown>;
    refreshToken(refreshToken?: string): Promise<unknown>;
    submit(
        entity: string,
        data: Record<string, unknown>,
        opts?: { transactionId?: string; skipHooks?: boolean },
    ): Promise<{ ok: boolean; seq: number }>;
    delete(
        entity: string,
        seq: number,
        opts?: { transactionId?: string; hard?: boolean; skipHooks?: boolean },
    ): Promise<{ ok: boolean; deleted: number }>;
    query<T = unknown>(
        entity: string,
        req: EntityQueryRequest,
    ): Promise<{ ok: boolean; data: { items: T[]; count: number } }>;
}

type ClientConstructor<TClient extends EntityClientShape> = new (
    options?: EntityServerClientOptions,
) => TClient;

export interface UseEntityClientResult<TClient extends EntityClientShape> {
    client: TClient;
    isPending: boolean;
    error: Error | null;
    reset: () => void;
    submit: (
        entity: string,
        data: Record<string, unknown>,
        opts?: { transactionId?: string; skipHooks?: boolean },
    ) => Promise<{ ok: boolean; seq: number }>;
    del: (
        entity: string,
        seq: number,
        opts?: { transactionId?: string; hard?: boolean; skipHooks?: boolean },
    ) => Promise<{ ok: boolean; deleted: number }>;
    query: <T = unknown>(
        entity: string,
        req: EntityQueryRequest,
    ) => Promise<{ ok: boolean; data: { items: T[]; count: number } }>;
}

export function useEntityClient<TClient extends EntityClientShape>(
    options: UseEntityServerOptions,
    config: {
        singletonInstance: TClient;
        ClientClass: ClientConstructor<TClient>;
    },
): UseEntityClientResult<TClient> {
    const {
        singleton = true,
        tokenResolver,
        baseUrl,
        token,
        resumeSession,
    } = options;

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const client = useMemo(() => {
        const instance = singleton
            ? config.singletonInstance
            : new config.ClientClass({ baseUrl, token });

        if (singleton) {
            instance.configure({ baseUrl, token });
        }

        const resolvedToken = tokenResolver?.();
        if (typeof resolvedToken === "string") {
            instance.setToken(resolvedToken);
        }

        return instance;
    }, [
        singleton,
        tokenResolver,
        baseUrl,
        token,
        config.ClientClass,
        config.singletonInstance,
    ]);

    const resumeTokenRef = useRef(resumeSession);
    useEffect(() => {
        if (!resumeTokenRef.current) return;
        if (client.checkHealth) {
            client.checkHealth(true).catch(() => {
                // refresh cookie 만료 등 — onSessionExpired 콜백에서 처리 가능
            });
            return;
        }

        client.refreshToken(resumeTokenRef.current).catch(() => {
            // 하위 호환 fallback
        });
    }, [client]);

    const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
        if (mountedRef.current) {
            setIsPending(true);
            setError(null);
        }
        try {
            const result = await fn();
            return result;
        } catch (err) {
            const wrapped = err instanceof Error ? err : new Error(String(err));
            if (mountedRef.current) setError(wrapped);
            throw wrapped;
        } finally {
            if (mountedRef.current) setIsPending(false);
        }
    }, []);

    const submit = useCallback<UseEntityClientResult<TClient>["submit"]>(
        (entity, data, opts) => run(() => client.submit(entity, data, opts)),
        [client, run],
    );

    const del = useCallback<UseEntityClientResult<TClient>["del"]>(
        (entity, seq, opts) => run(() => client.delete(entity, seq, opts)),
        [client, run],
    );

    const query = useCallback<UseEntityClientResult<TClient>["query"]>(
        (entity, req) => run(() => client.query(entity, req)),
        [client, run],
    );

    const reset = useCallback(() => {
        setIsPending(false);
        setError(null);
    }, []);

    return { client, isPending, error, reset, submit, del, query };
}
