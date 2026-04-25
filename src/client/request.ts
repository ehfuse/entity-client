import { derivePacketKey, encryptPacket, decryptPacket } from "./packet.js";
import { buildHmacHeaders } from "./hmac.js";

export interface RequestOptions {
    baseUrl: string;
    token: string;
    anonymousPacketToken: string;
    apiKey: string;
    hmacSecret: string;
    encryptRequests: boolean;
    csrfEnabled: boolean;
    csrfHeaderName: string;
    csrfCookieName: string;
    refreshCsrfCookie: (() => Promise<void>) | null;
    onAccessToken?: (token: string) => void;
    requestAbortControllers: Map<string, AbortController>;
}

export interface EntityRequestConfig {
    requireOkShape?: boolean;
    allowStatuses?: number[];
    signal?: AbortSignal;
    autoAbortKey?: string | false;
}

// isAutoAbortableMethod는 기본 자동 취소 키를 허용하는 쓰기 메서드인지 확인합니다.
function isAutoAbortableMethod(method: string): boolean {
    switch (method.toUpperCase()) {
        case "POST":
        case "PUT":
        case "PATCH":
        case "DELETE":
            return true;
        default:
            return false;
    }
}

// resolveAutoAbortKey는 요청별 자동 취소 키를 계산합니다.
function resolveAutoAbortKey(
    method: string,
    path: string,
    config: EntityRequestConfig,
): string | null {
    if (config.autoAbortKey === false) {
        return null;
    }

    if (typeof config.autoAbortKey === "string") {
        const trimmed = config.autoAbortKey.trim();
        return trimmed ? trimmed : null;
    }

    if (isAutoAbortableMethod(method)) {
        return `${method.toUpperCase()} ${path}`;
    }

    return null;
}

// composeAbortSignal은 외부 signal과 내부 취소 signal을 하나로 합칩니다.
function composeAbortSignal(
    signals: Array<AbortSignal | undefined>,
): AbortSignal | undefined {
    const activeSignals = signals.filter(
        (signal): signal is AbortSignal => !!signal,
    );
    if (activeSignals.length === 0) {
        return undefined;
    }
    if (activeSignals.length === 1) {
        return activeSignals[0];
    }
    if (typeof AbortSignal.any === "function") {
        return AbortSignal.any(activeSignals);
    }

    const controller = new AbortController();
    const abort = () => controller.abort();
    for (const signal of activeSignals) {
        if (signal.aborted) {
            controller.abort();
            break;
        }
        signal.addEventListener("abort", abort, { once: true });
    }
    return controller.signal;
}

// createManagedAbortSignal은 같은 키의 이전 요청을 취소하고 현재 요청 signal을 반환합니다.
function createManagedAbortSignal(
    opts: RequestOptions,
    method: string,
    path: string,
    requestConfig: EntityRequestConfig,
): {
    signal?: AbortSignal;
    abortKey: string | null;
    controller: AbortController | null;
} {
    const abortKey = resolveAutoAbortKey(method, path, requestConfig);
    if (!abortKey) {
        return {
            signal: requestConfig.signal,
            abortKey: null,
            controller: null,
        };
    }

    opts.requestAbortControllers.get(abortKey)?.abort();

    const controller = new AbortController();
    opts.requestAbortControllers.set(abortKey, controller);

    return {
        signal: composeAbortSignal([requestConfig.signal, controller.signal]),
        abortKey,
        controller,
    };
}

// clearManagedAbortSignal은 현재 요청이 등록한 취소 키만 안전하게 정리합니다.
function clearManagedAbortSignal(
    opts: RequestOptions,
    abortKey: string | null,
    controller: AbortController | null,
): void {
    if (!abortKey || !controller) {
        return;
    }
    if (opts.requestAbortControllers.get(abortKey) === controller) {
        opts.requestAbortControllers.delete(abortKey);
    }
}

function resolvePacketSource(opts: RequestOptions): string {
    return opts.hmacSecret || opts.token || opts.anonymousPacketToken;
}

function resolveResponsePacketSource(
    opts: RequestOptions,
    withAuth: boolean,
    anonymousPacketToken: string,
): string {
    if (opts.hmacSecret) {
        return opts.hmacSecret;
    }

    if (!withAuth) {
        return anonymousPacketToken;
    }

    return opts.token || anonymousPacketToken;
}

function maskPacketSource(value: string): string {
    if (!value) {
        return "";
    }

    if (value.length <= 8) {
        return `${value.slice(0, 2)}...${value.slice(-2)}`;
    }

    return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function logPacketDecryptError(details: {
    method: string;
    path: string;
    withAuth: boolean;
    status: number;
    contentType: string;
    responsePacketSource: string;
    tokenPresent: boolean;
    anonymousPacketTokenPresent: boolean;
    hmacEnabled: boolean;
    error: unknown;
}): void {
    if (typeof console === "undefined" || typeof console.error !== "function") {
        return;
    }

    console.error("[entity-client] packet decrypt failed", {
        method: details.method,
        path: details.path,
        withAuth: details.withAuth,
        status: details.status,
        contentType: details.contentType,
        responsePacketSource: maskPacketSource(details.responsePacketSource),
        tokenPresent: details.tokenPresent,
        anonymousPacketTokenPresent: details.anonymousPacketTokenPresent,
        hmacEnabled: details.hmacEnabled,
        error:
            details.error instanceof Error
                ? {
                      name: details.error.name,
                      message: details.error.message,
                      stack: details.error.stack,
                  }
                : details.error,
    });
}

function requiresCsrf(method: string): boolean {
    return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}

function readCsrfCookie(name: string): string {
    if (typeof document === "undefined") return "";
    for (const chunk of document.cookie.split(";")) {
        const idx = chunk.indexOf("=");
        if (idx < 0) continue;
        if (chunk.substring(0, idx).trim() === name) {
            return decodeURIComponent(chunk.substring(idx + 1).trim());
        }
    }
    return "";
}

function isCsrfError(status: number, message: string): boolean {
    if (status === 403 && /csrf/i.test(message)) {
        return true;
    }

    return (
        /csrf/i.test(message) &&
        /expired|token validation failed/i.test(message)
    );
}

async function readErrorMessage(res: Response): Promise<string> {
    const contentType = res.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/json")) {
        const data = (await res.json().catch(() => null)) as {
            error?: string;
            message?: string;
        } | null;
        if (data?.error) return data.error;
        if (data?.message) return data.message;
    }

    const text = await res.text().catch(() => "");
    return text || `HTTP ${res.status}`;
}

/**
 * Entity Server에 HTTP 요청을 보냅니다.
 *
 * - `encryptRequests` 활성화 시 인증된 POST 바디를 자동 암호화합니다.
 * - 응답이 `application/octet-stream`이면 자동 복호화합니다.
 * - JSON 응답의 `ok`가 false이면 에러를 던집니다.
 */
export async function entityRequest<T>(
    opts: RequestOptions,
    method: string,
    path: string,
    body?: unknown,
    withAuth = true,
    extraHeaders: Record<string, string> = {},
    config: boolean | EntityRequestConfig = true,
): Promise<T> {
    const requestConfig: EntityRequestConfig =
        typeof config === "boolean" ? { requireOkShape: config } : config;
    const requireOkShape = requestConfig.requireOkShape ?? true;
    const allowStatuses = new Set(requestConfig.allowStatuses ?? []);
    const managedAbort = createManagedAbortSignal(
        opts,
        method,
        path,
        requestConfig,
    );
    const signal = managedAbort.signal;

    const {
        baseUrl,
        token,
        apiKey,
        hmacSecret,
        encryptRequests,
        csrfEnabled,
        csrfHeaderName,
        csrfCookieName,
        refreshCsrfCookie,
        onAccessToken,
    } = opts;
    // checkHealth()가 완료되기 전 race condition을 막기 위해 anon_token 쿠키를 직접 fallback으로 읽음
    const anonymousPacketToken =
        opts.anonymousPacketToken || readCsrfCookie("anon_token");
    const isHmacMode = withAuth && !!(apiKey && hmacSecret);
    const packetSource = resolvePacketSource(opts);
    const responsePacketSource = resolveResponsePacketSource(
        opts,
        withAuth,
        anonymousPacketToken,
    );
    const shouldUseCsrf = csrfEnabled && requiresCsrf(method) && !isHmacMode;
    let csrfToken = shouldUseCsrf ? readCsrfCookie(csrfCookieName) : "";
    let requestContentType = "application/json";
    const includeAnonymousPacketHeader = !isHmacMode && !!anonymousPacketToken;

    let fetchBody: string | Uint8Array | null = null;
    if (body != null) {
        const shouldEncrypt =
            encryptRequests &&
            !!packetSource &&
            withAuth &&
            method !== "GET" &&
            method !== "HEAD";

        if (shouldEncrypt) {
            const key = derivePacketKey(
                hmacSecret,
                token || anonymousPacketToken,
            );
            fetchBody = encryptPacket(
                new TextEncoder().encode(JSON.stringify(body)),
                key,
            );
            requestContentType = "application/octet-stream";
        } else {
            fetchBody = JSON.stringify(body);
        }
    }

    const buildHeaders = (
        resolvedCsrfToken: string,
    ): Record<string, string> => {
        const headers: Record<string, string> = { ...extraHeaders };
        const hasExplicitContentType = Object.keys(headers).some(
            (key) => key.toLowerCase() === "content-type",
        );
        if (fetchBody != null && !hasExplicitContentType) {
            headers["Content-Type"] = requestContentType;
        }
        if (!isHmacMode && withAuth && token) {
            headers.Authorization = `Bearer ${token}`;
        }
        if (includeAnonymousPacketHeader) {
            headers["X-Packet-Token"] = anonymousPacketToken;
        }
        if (shouldUseCsrf && resolvedCsrfToken) {
            headers[csrfHeaderName] = resolvedCsrfToken;
        }
        if (isHmacMode) {
            const bodyBytes =
                fetchBody instanceof Uint8Array
                    ? fetchBody
                    : typeof fetchBody === "string"
                      ? new TextEncoder().encode(fetchBody)
                      : new Uint8Array(0);
            Object.assign(
                headers,
                buildHmacHeaders(method, path, bodyBytes, apiKey, hmacSecret),
            );
        }
        return headers;
    };

    if (shouldUseCsrf && !csrfToken && refreshCsrfCookie) {
        await refreshCsrfCookie();
        csrfToken = readCsrfCookie(csrfCookieName);
    }

    const executeRequest = (resolvedCsrfToken: string): Promise<Response> =>
        fetch(baseUrl + path, {
            method,
            headers: buildHeaders(resolvedCsrfToken),
            ...(fetchBody != null
                ? { body: fetchBody as RequestInit["body"] }
                : {}),
            credentials: "include",
            signal,
        });

    try {
        let res = await executeRequest(csrfToken);

        if (!res.ok) {
            const message = await readErrorMessage(res.clone());
            if (
                shouldUseCsrf &&
                refreshCsrfCookie &&
                isCsrfError(res.status, message)
            ) {
                await refreshCsrfCookie();
                csrfToken = readCsrfCookie(csrfCookieName);
                res = await executeRequest(csrfToken);
            } else if (!allowStatuses.has(res.status)) {
                const err = new Error(message);
                (err as { status?: number }).status = res.status;
                throw err;
            } else {
                // 허용된 비정상 상태는 본문을 그대로 파싱해 호출자에게 넘깁니다.
            }
        }

        if (!res.ok && !allowStatuses.has(res.status)) {
            const err = new Error(await readErrorMessage(res));
            (err as { status?: number }).status = res.status;
            throw err;
        }

        const accessTokenHeader =
            res.headers.get("X-Access-Token")?.trim() ?? "";

        const contentType = res.headers.get("Content-Type") ?? "";
        if (contentType.includes("application/octet-stream")) {
            const key = derivePacketKey(hmacSecret, responsePacketSource);
            const encryptedBody = await res.arrayBuffer();
            let decrypted: T;

            try {
                decrypted = decryptPacket<T>(encryptedBody, key);
            } catch (error) {
                logPacketDecryptError({
                    method,
                    path,
                    withAuth,
                    status: res.status,
                    contentType,
                    responsePacketSource,
                    tokenPresent: !!token,
                    anonymousPacketTokenPresent: !!anonymousPacketToken,
                    hmacEnabled: !!hmacSecret,
                    error,
                });
                throw error;
            }

            if (accessTokenHeader) {
                onAccessToken?.(accessTokenHeader);
            }
            return decrypted;
        }

        if (accessTokenHeader) {
            onAccessToken?.(accessTokenHeader);
        }

        if (!contentType.includes("application/json")) {
            return (await res.text()) as T;
        }

        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (requireOkShape && !data.ok && !allowStatuses.has(res.status)) {
            const err = new Error(
                data.message ?? `EntityServer error (HTTP ${res.status})`,
            );
            (err as { status?: number }).status = res.status;
            throw err;
        } else {
            return data as T;
        }
    } finally {
        clearManagedAbortSignal(
            opts,
            managedAbort.abortKey,
            managedAbort.controller,
        );
    }
}
