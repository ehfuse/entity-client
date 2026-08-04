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
    /**
     * dev 디버그 평문 시크릿. 설정되면 요청을 암호화하지 않고(평문),
     * `X-Debug-Plain` 헤더로 전송한다. 서버의 `DEBUG_PLAIN_SECRET` 과 일치하면
     * 서버도 해당 요청/응답을 평문으로 처리한다(패킷 암호화 우회).
     */
    debugPlainSecret?: string;
}

export interface EntityRequestConfig {
    requireOkShape?: boolean;
    allowStatuses?: number[];
    signal?: AbortSignal;
    autoAbortKey?: string | false;
}

export interface EntityRequestError extends Error {
    status?: number;
    code?: string;
    details?: unknown;
}

interface EntityErrorBody {
    error?: string;
    message?: string;
    code?: string;
    [key: string]: unknown;
}

interface EntityErrorDetails {
    message: string;
    code?: string;
    body?: EntityErrorBody;
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

    // 자동 취소(같은 경로 중복 요청 취소)는 브라우저 UX 최적화다. 서버(Node)에서는
    // 동시 요청이 정상 동작이므로 기본 자동 취소를 적용하지 않는다 — 같은 경로 동시 호출이
    // 서로를 AbortError 로 취소하는 문제(예: 한 핸들러에서 같은 엔티티 list 2개를 Promise.all 로
    // 동시 호출, 또는 폴링으로 동시 요청이 겹치는 경우)를 막는다.
    // 명시적 autoAbortKey(문자열/false)는 서버에서도 위에서 그대로 존중한다.
    if (typeof window === "undefined") {
        return null;
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

// HMAC nonce 재사용 응답인지 확인합니다.
function isHmacNonceReuseError(status: number, message: string): boolean {
    return status === 401 && /nonce already used/i.test(message);
}

// readErrorDetails는 에러 응답 본문에서 메시지와 코드를 추출합니다.
async function readErrorDetails(res: Response): Promise<EntityErrorDetails> {
    const contentType = res.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/json")) {
        const data = (await res
            .json()
            .catch(() => null)) as EntityErrorBody | null;
        if (data?.error)
            return { message: data.error, code: data.code, body: data };
        if (data?.message)
            return { message: data.message, code: data.code, body: data };
    }

    const text = await res.text().catch(() => "");
    return { message: text || `HTTP ${res.status}` };
}

// createEntityRequestError는 HTTP 에러 정보를 Error 객체에 보존합니다.
function createEntityRequestError(
    status: number,
    details: EntityErrorDetails,
): EntityRequestError {
    const err = new Error(details.message) as EntityRequestError;
    err.status = status;
    if (details.code) {
        err.code = details.code;
    }
    if (details.body) {
        err.details = details.body;
    }
    return err;
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
        debugPlainSecret,
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
            !debugPlainSecret &&
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
        // dev 디버그 바이패스: 서버가 평문 처리하도록 시크릿 헤더를 보낸다.
        if (debugPlainSecret) {
            headers["X-Debug-Plain"] = debugPlainSecret;
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
            const details = await readErrorDetails(res.clone());
            if (
                isHmacMode &&
                isHmacNonceReuseError(res.status, details.message)
            ) {
                res = await executeRequest(csrfToken);
            } else if (
                shouldUseCsrf &&
                refreshCsrfCookie &&
                isCsrfError(res.status, details.message)
            ) {
                await refreshCsrfCookie();
                csrfToken = readCsrfCookie(csrfCookieName);
                res = await executeRequest(csrfToken);
            } else if (!allowStatuses.has(res.status)) {
                throw createEntityRequestError(res.status, details);
            } else {
                // 허용된 비정상 상태는 본문을 그대로 파싱해 호출자에게 넘깁니다.
            }
        }

        if (!res.ok && !allowStatuses.has(res.status)) {
            throw createEntityRequestError(
                res.status,
                await readErrorDetails(res),
            );
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

        const data = (await res.json()) as {
            ok?: boolean;
            message?: string;
            code?: string;
        };
        if (requireOkShape && !data.ok && !allowStatuses.has(res.status)) {
            throw createEntityRequestError(res.status, {
                message:
                    data.message ?? `EntityServer error (HTTP ${res.status})`,
                code: data.code,
                body: data,
            });
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

/** 업로드 진행률 콜백이다. (loaded/total 은 byte 단위) */
export type UploadProgressHandler = (loaded: number, total: number) => void;

/**
 * XHR 로 multipart 를 전송해 업로드 진행률 이벤트를 제공한다.
 * fetch 는 업로드 진행 이벤트가 없어 진행률이 필요한 호출만 이 경로를 탄다.
 * 결과는 fetch 와 동일하게 다루도록 표준 `Response` 로 감싸 반환한다.
 */
function executeXhrFormRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    form: FormData,
    onUploadProgress: UploadProgressHandler,
): Promise<Response> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.withCredentials = true;
        xhr.responseType = "arraybuffer";
        for (const [key, value] of Object.entries(headers)) {
            xhr.setRequestHeader(key, value);
        }
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) onUploadProgress(event.loaded, event.total);
        };
        xhr.onload = () => {
            const responseHeaders = new Headers();
            for (const line of xhr.getAllResponseHeaders().trim().split(/[\r\n]+/)) {
                const separatorIndex = line.indexOf(": ");
                if (separatorIndex > 0) {
                    responseHeaders.append(line.slice(0, separatorIndex), line.slice(separatorIndex + 2));
                }
            }
            // Response 는 204/205/304 에 body 를 허용하지 않는다.
            const body = [204, 205, 304].includes(xhr.status) ? null : (xhr.response as ArrayBuffer);
            resolve(
                new Response(body, {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    headers: responseHeaders,
                }),
            );
        };
        xhr.onerror = () => reject(new TypeError("Network request failed"));
        xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
        xhr.send(form);
    });
}

/**
 * multipart/form-data(파일 업로드) 요청을 패킷 암호화와 무관하게 보낸다.
 *
 * 파일 업로드는 요청 본문(FormData)을 암호화하지 않는다. 서버가 multipart 를 그대로 파싱하기 때문이다.
 * 다만 패킷 암호화가 켜진 서버는 **응답**을 `application/octet-stream` 으로 암호화해 내려줄 수 있으므로,
 * 일반 `entityRequest` 와 동일하게 `X-Debug-Plain`/`X-Packet-Token`/HMAC 헤더를 실어 보내고
 * 응답 Content-Type 에 따라 (octet-stream 이면 복호화, 아니면 JSON) 자동 처리한다.
 *
 * 기존 raw `fetch + res.json()` 방식은 암호화 응답을 복호화하지 못해
 * `Unexpected token '...' is not valid JSON` 으로 깨졌다. (HTTP 200 이어도)
 *
 * `onUploadProgress` 를 넘기면 fetch 대신 XHR 로 전송해 업로드 진행률을 콜백으로 알린다.
 */
export async function requestFormData<T>(
    opts: RequestOptions,
    method: string,
    path: string,
    form: FormData,
    withAuth = true,
    onUploadProgress?: UploadProgressHandler,
): Promise<T> {
    const {
        baseUrl,
        token,
        apiKey,
        hmacSecret,
        csrfEnabled,
        csrfHeaderName,
        csrfCookieName,
        refreshCsrfCookie,
        onAccessToken,
        debugPlainSecret,
    } = opts;

    const anonymousPacketToken =
        opts.anonymousPacketToken || readCsrfCookie("anon_token");
    const isHmacMode = withAuth && !!(apiKey && hmacSecret);
    const responsePacketSource = resolveResponsePacketSource(
        opts,
        withAuth,
        anonymousPacketToken,
    );
    const shouldUseCsrf = csrfEnabled && requiresCsrf(method) && !isHmacMode;
    const includeAnonymousPacketHeader = !isHmacMode && !!anonymousPacketToken;
    let csrfToken = shouldUseCsrf ? readCsrfCookie(csrfCookieName) : "";

    if (shouldUseCsrf && !csrfToken && refreshCsrfCookie) {
        await refreshCsrfCookie();
        csrfToken = readCsrfCookie(csrfCookieName);
    }

    // multipart 는 Content-Type(boundary)을 fetch 가 자동 설정하도록 두고, 우리는 인증/패킷 헤더만 더한다.
    // HMAC 모드는 본문 바이트 서명이 필요하므로 multipart 업로드(브라우저 스트림 바디)에는 적용하지 않는다.
    const buildHeaders = (resolvedCsrfToken: string): Record<string, string> => {
        const headers: Record<string, string> = {};
        if (!isHmacMode && withAuth && token) {
            headers.Authorization = `Bearer ${token}`;
        }
        if (isHmacMode && apiKey) {
            headers["X-API-Key"] = apiKey;
        }
        if (includeAnonymousPacketHeader) {
            headers["X-Packet-Token"] = anonymousPacketToken;
        }
        if (debugPlainSecret) {
            headers["X-Debug-Plain"] = debugPlainSecret;
        }
        if (shouldUseCsrf && resolvedCsrfToken) {
            headers[csrfHeaderName] = resolvedCsrfToken;
        }
        return headers;
    };

    const executeRequest = (resolvedCsrfToken: string): Promise<Response> =>
        onUploadProgress
            ? executeXhrFormRequest(
                  baseUrl + path,
                  method,
                  buildHeaders(resolvedCsrfToken),
                  form,
                  onUploadProgress,
              )
            : fetch(baseUrl + path, {
                  method,
                  headers: buildHeaders(resolvedCsrfToken),
                  body: form,
                  credentials: "include",
              });

    let res = await executeRequest(csrfToken);

    if (
        !res.ok &&
        shouldUseCsrf &&
        refreshCsrfCookie &&
        isCsrfError(res.status, (await readErrorDetails(res.clone())).message)
    ) {
        await refreshCsrfCookie();
        csrfToken = readCsrfCookie(csrfCookieName);
        res = await executeRequest(csrfToken);
    }

    if (!res.ok) {
        throw createEntityRequestError(res.status, await readErrorDetails(res));
    }

    const accessTokenHeader = res.headers.get("X-Access-Token")?.trim() ?? "";
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

    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (!data.ok) {
        const err = new Error(
            data.message ?? `EntityServer error (HTTP ${res.status})`,
        );
        (err as { status?: number }).status = res.status;
        throw err;
    }
    return data as T;
}
