import { derivePacketKey, encryptPacket, decryptPacket } from "./packet";
import { buildHmacHeaders } from "./hmac";

export interface RequestOptions {
    baseUrl: string;
    token: string;
    anonymousPacketToken: string;
    apiKey: string;
    hmacSecret: string;
    encryptRequests: boolean;
    csrfEnabled: boolean;
    csrfToken: string;
    csrfHeaderName: string;
    refreshCsrfToken: (() => Promise<string>) | null;
}

function resolvePacketSource(opts: RequestOptions): string {
    return opts.hmacSecret || opts.token || opts.anonymousPacketToken;
}

function requiresCsrf(method: string): boolean {
    return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}

function isCsrfError(status: number, message: string): boolean {
    if (status === 403 && /csrf/i.test(message)) {
        return true;
    }

    return /csrf/i.test(message) && /expired|token validation failed/i.test(message);
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
    requireOkShape = true,
): Promise<T> {
    const {
        baseUrl,
        token,
        apiKey,
        hmacSecret,
        encryptRequests,
        anonymousPacketToken,
        csrfEnabled,
        csrfHeaderName,
        refreshCsrfToken,
    } = opts;
    const isHmacMode = withAuth && !!(apiKey && hmacSecret);
    const packetSource = resolvePacketSource(opts);
    const shouldUseCsrf = csrfEnabled && requiresCsrf(method) && !isHmacMode;
    let csrfToken = opts.csrfToken;
    let requestContentType = "application/json";
    const includeAnonymousPacketHeader =
        !token && !isHmacMode && !!anonymousPacketToken;

    let fetchBody: string | Uint8Array | null = null;
    if (body != null) {
        const shouldEncrypt =
            encryptRequests &&
            !!packetSource &&
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

    const buildHeaders = (resolvedCsrfToken: string): Record<string, string> => {
        const headers: Record<string, string> = {
            "Content-Type": requestContentType,
            ...extraHeaders,
        };
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

    if (shouldUseCsrf && !csrfToken && refreshCsrfToken) {
        csrfToken = await refreshCsrfToken();
    }

    const executeRequest = (resolvedCsrfToken: string): Promise<Response> =>
        fetch(baseUrl + path, {
            method,
            headers: buildHeaders(resolvedCsrfToken),
            ...(fetchBody != null
                ? { body: fetchBody as RequestInit["body"] }
                : {}),
            credentials: "include",
        });

    let res = await executeRequest(csrfToken);

    if (!res.ok) {
        const message = await readErrorMessage(res.clone());
        if (shouldUseCsrf && refreshCsrfToken && isCsrfError(res.status, message)) {
            csrfToken = await refreshCsrfToken();
            res = await executeRequest(csrfToken);
        } else {
            const err = new Error(message);
            (err as { status?: number }).status = res.status;
            throw err;
        }
    }

    if (!res.ok) {
        const err = new Error(await readErrorMessage(res));
        (err as { status?: number }).status = res.status;
        throw err;
    }

    const contentType = res.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/octet-stream")) {
        const key = derivePacketKey(hmacSecret, token || anonymousPacketToken);
        return decryptPacket<T>(await res.arrayBuffer(), key);
    }

    if (!contentType.includes("application/json")) {
        return (await res.text()) as T;
    }

    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (requireOkShape && !data.ok) {
        const err = new Error(
            data.message ?? `EntityServer error (HTTP ${res.status})`,
        );
        (err as { status?: number }).status = res.status;
        throw err;
    }

    return data as T;
}
