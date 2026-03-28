import type { EntityServerClientOptions } from "../types.js";
import { readEnv } from "./utils.js";
import { derivePacketKey, parseRequestBody } from "./packet.js";
import { entityRequest, type RequestOptions } from "./request.js";

// mixin 헬퍼 타입
export type GConstructor<T = object> = new (...args: any[]) => T;

export class EntityServerClientBase {
    baseUrl: string;
    token: string;
    anonymousPacketToken: string;
    apiKey: string;
    hmacSecret: string;
    encryptRequests: boolean;
    csrfEnabled: boolean;
    csrfHeaderName: string;
    csrfCookieName: string;
    /** @internal health 재호출로 CSRF 쿠키 갱신 (AuthMixin에서 설정) */
    _csrfRefresher: (() => Promise<void>) | null = null;
    activeTxId: string | null = null;

    // 세션 유지 관련
    keepSession: boolean;
    refreshBuffer: number;
    onTokenRefreshed?: (accessToken: string, expiresIn: number) => void;
    onSessionExpired?: (error: Error) => void;
    onHealthChange?: (online: boolean) => void;
    _sessionRefreshToken: string | null = null;
    _refreshTimer: ReturnType<typeof setTimeout> | null = null;
    _healthTickTimer: ReturnType<typeof setInterval> | null = null;
    _healthTickPromise: Promise<unknown> | null = null;
    // ─── 초기화 & 설정 ────────────────────────────────────────────────────────

    /**
     * EntityServerClient 인스턴스를 생성합니다.
     *
     * 기본값:
     * - `baseUrl`: `VITE_ENTITY_SERVER_URL` 또는 상대 경로(`""`)
     */
    constructor(options: EntityServerClientOptions = {}) {
        const envBaseUrl = readEnv("VITE_ENTITY_SERVER_URL");

        this.baseUrl = (options.baseUrl ?? envBaseUrl ?? "").replace(/\/$/, "");
        this.token = options.token ?? "";
        this.anonymousPacketToken = options.anonymousPacketToken ?? "";
        this.apiKey = options.apiKey ?? "";
        this.hmacSecret = options.hmacSecret ?? "";
        this.encryptRequests = options.encryptRequests ?? false;
        this.csrfEnabled = options.csrfEnabled ?? false;
        this.csrfHeaderName = options.csrfHeaderName ?? "x-csrf-token";
        this.csrfCookieName = options.csrfCookieName ?? "_csrf";
        this.keepSession = options.keepSession ?? false;
        this.refreshBuffer = options.refreshBuffer ?? 60;
        this.onTokenRefreshed = options.onTokenRefreshed;
        this.onSessionExpired = options.onSessionExpired;
        this.onHealthChange = options.onHealthChange;
        if (
            typeof options.healthTickInterval === "number" &&
            options.healthTickInterval > 0
        ) {
            // _csrfRefresher는 AuthMixin에서 설정되므로 다음 tick에 시작
            Promise.resolve().then(() =>
                this.startHealthTick(options.healthTickInterval),
            );
        }
    }

    /** baseUrl, token, encryptRequests 값을 런타임에 갱신합니다. */
    configure(options: Partial<EntityServerClientOptions>): void {
        if (typeof options.baseUrl === "string") {
            this.baseUrl = options.baseUrl.replace(/\/$/, "");
        }
        if (typeof options.token === "string") this.token = options.token;
        if (typeof options.anonymousPacketToken === "string") {
            this.anonymousPacketToken = options.anonymousPacketToken;
        }
        if (typeof options.encryptRequests === "boolean")
            this.encryptRequests = options.encryptRequests;
        if (typeof options.csrfEnabled === "boolean") {
            this.csrfEnabled = options.csrfEnabled;
        }
        if (typeof options.csrfHeaderName === "string") {
            this.csrfHeaderName = options.csrfHeaderName;
        }
        if (typeof options.csrfCookieName === "string") {
            this.csrfCookieName = options.csrfCookieName;
        }
        if (typeof options.apiKey === "string") this.apiKey = options.apiKey;
        if (typeof options.hmacSecret === "string")
            this.hmacSecret = options.hmacSecret;
        if (typeof options.keepSession === "boolean")
            this.keepSession = options.keepSession;
        if (typeof options.refreshBuffer === "number")
            this.refreshBuffer = options.refreshBuffer;
        if (options.onTokenRefreshed)
            this.onTokenRefreshed = options.onTokenRefreshed;
        if (options.onSessionExpired)
            this.onSessionExpired = options.onSessionExpired;
        if (options.onHealthChange)
            this.onHealthChange = options.onHealthChange;
        if (
            typeof options.healthTickInterval === "number" &&
            options.healthTickInterval > 0
        ) {
            Promise.resolve().then(() =>
                this.startHealthTick(options.healthTickInterval),
            );
        }
    }

    /** 인증 요청에 사용할 JWT Access Token을 설정합니다. */
    setToken(token: string): void {
        this.token = token;
    }

    /** 익명 패킷 암호화용 토큰을 설정합니다. */
    setAnonymousPacketToken(token: string): void {
        this.anonymousPacketToken = token;
    }

    /** HMAC 인증용 API Key를 설정합니다. */
    setApiKey(apiKey: string): void {
        this.apiKey = apiKey;
    }

    /** HMAC 인증용 시크릿을 설정합니다. */
    setHmacSecret(secret: string): void {
        this.hmacSecret = secret;
    }

    /** 암호화 요청 활성화 여부를 설정합니다. */
    setEncryptRequests(value: boolean): void {
        this.encryptRequests = value;
    }

    setCsrfEnabled(enabled: boolean): void {
        this.csrfEnabled = enabled;
    }

    /**
     * 주기적으로 health 체크를 실행합니다.
     * CSRF 쿠키 갱신과 서버 상태 확인을 자동화합니다.
     *
     * @param intervalMs 호출 주기(ms). 기본값: 5분
     */
    startHealthTick(intervalMs: number = 5 * 60 * 1000): void {
        this.stopHealthTick();
        const tick = (): void => {
            if (this._healthTickPromise) return;
            this._healthTickPromise = (
                this._csrfRefresher ? this._csrfRefresher() : Promise.resolve()
            )
                .then(() => {
                    this.onHealthChange?.(true);
                })
                .catch(() => {
                    this.onHealthChange?.(false);
                })
                .finally(() => {
                    this._healthTickPromise = null;
                });
        };
        tick(); // 즉시 1회 실행
        this._healthTickTimer = setInterval(tick, intervalMs);
    }

    /** health tick 타이머를 중지합니다. */
    stopHealthTick(): void {
        if (this._healthTickTimer !== null) {
            clearInterval(this._healthTickTimer);
            this._healthTickTimer = null;
        }
        this._healthTickPromise = null;
    }

    // ─── 세션 유지 ────────────────────────────────────────────────────────────

    /** @internal 자동 토큰 갱신 타이머를 시작합니다. */
    _scheduleKeepSession(
        refreshToken: string,
        expiresIn: number,
        refreshFn: (
            rt: string,
        ) => Promise<{ access_token: string; expires_in: number }>,
    ): void {
        this._clearRefreshTimer();
        this._sessionRefreshToken = refreshToken;
        const delayMs = Math.max((expiresIn - this.refreshBuffer) * 1000, 0);
        this._refreshTimer = setTimeout(async () => {
            if (!this._sessionRefreshToken) return;
            try {
                const result = await refreshFn(this._sessionRefreshToken);
                this.onTokenRefreshed?.(result.access_token, result.expires_in);
                this._scheduleKeepSession(
                    this._sessionRefreshToken,
                    result.expires_in,
                    refreshFn,
                );
            } catch (err) {
                this._clearRefreshTimer();
                this.onSessionExpired?.(
                    err instanceof Error ? err : new Error(String(err)),
                );
            }
        }, delayMs);
    }

    /** @internal 자동 갱신 타이머를 정리합니다. */
    _clearRefreshTimer(): void {
        if (this._refreshTimer !== null) {
            clearTimeout(this._refreshTimer);
            this._refreshTimer = null;
        }
    }

    /**
     * 세션 유지 타이머를 중지합니다.
     * `logout()` 호출 시 자동으로 중지되며, 직접 호출이 필요한 경우는 드뭅니다.
     */
    stopKeepSession(): void {
        this._clearRefreshTimer();
        this._sessionRefreshToken = null;
    }

    _applyCsrfHealth(): void {
        if (typeof document === "undefined") return;
        for (const chunk of document.cookie.split(";")) {
            const idx = chunk.indexOf("=");
            if (idx < 0) continue;
            if (chunk.substring(0, idx).trim() === this.csrfCookieName) {
                this.csrfEnabled = !!chunk.substring(idx + 1).trim();
                return;
            }
        }
        this.csrfEnabled = false;
    }

    // ─── 요청 본문 파싱 ───────────────────────────────────────────────────────

    /**
     * 요청 바디를 파싱합니다.
     * `application/octet-stream`이면 XChaCha20-Poly1305 복호화, 그 외는 JSON 파싱합니다.
     *
     * @param requireEncrypted `true`이면 암호화된 요청만 허용합니다.
     */
    readRequestBody<T = Record<string, unknown>>(
        body: ArrayBuffer | Uint8Array | string | T | null | undefined,
        contentType = "application/json",
        requireEncrypted = false,
    ): T {
        const key = derivePacketKey(
            this.hmacSecret,
            this.token || this.anonymousPacketToken,
        );
        return parseRequestBody<T>(body, contentType, requireEncrypted, key);
    }

    // ─── 내부 헬퍼 ───────────────────────────────────────────────────────────

    get _reqOpts(): RequestOptions {
        return {
            baseUrl: this.baseUrl,
            token: this.token,
            anonymousPacketToken: this.anonymousPacketToken,
            apiKey: this.apiKey,
            hmacSecret: this.hmacSecret,
            encryptRequests: this.encryptRequests,
            csrfEnabled: this.csrfEnabled,
            csrfHeaderName: this.csrfHeaderName,
            csrfCookieName: this.csrfCookieName,
            refreshCsrfCookie: this.csrfEnabled ? this._csrfRefresher : null,
        };
    }

    /**
     * 커스텀 라우트 직접 호출용 HTTP 네임스페이스.
     * 인증·암호화·HMAC 등 SDK 옵션이 그대로 적용됩니다.
     *
     * @example
     * const res = await client.http.get<{ version: string }>("/api/v1/status", false);
     * const res = await client.http.post<MyResponse>("/api/v1/custom", { key: "value" });
     */
    get http() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        return {
            get<T>(
                path: string,
                withAuth = true,
                extraHeaders?: Record<string, string>,
            ): Promise<T> {
                return entityRequest<T>(
                    self._reqOpts,
                    "GET",
                    path,
                    undefined,
                    withAuth,
                    extraHeaders,
                    false,
                );
            },
            post<T>(
                path: string,
                body?: unknown,
                withAuth = true,
                extraHeaders?: Record<string, string>,
            ): Promise<T> {
                return entityRequest<T>(
                    self._reqOpts,
                    "POST",
                    path,
                    body,
                    withAuth,
                    extraHeaders,
                    false,
                );
            },
            put<T>(
                path: string,
                body?: unknown,
                withAuth = true,
                extraHeaders?: Record<string, string>,
            ): Promise<T> {
                return entityRequest<T>(
                    self._reqOpts,
                    "PUT",
                    path,
                    body,
                    withAuth,
                    extraHeaders,
                    false,
                );
            },
            patch<T>(
                path: string,
                body?: unknown,
                withAuth = true,
                extraHeaders?: Record<string, string>,
            ): Promise<T> {
                return entityRequest<T>(
                    self._reqOpts,
                    "PATCH",
                    path,
                    body,
                    withAuth,
                    extraHeaders,
                    false,
                );
            },
            delete<T>(
                path: string,
                body?: unknown,
                withAuth = true,
                extraHeaders?: Record<string, string>,
            ): Promise<T> {
                return entityRequest<T>(
                    self._reqOpts,
                    "DELETE",
                    path,
                    body,
                    withAuth,
                    extraHeaders,
                    false,
                );
            },
        };
    }

    /**
     * 임의 경로에 요청을 보내고 바이너리(ArrayBuffer)를 반환합니다.
     * 이미지, PDF, 압축 파일 등 바이너리 응답이 오는 엔드포인트에 사용합니다.
     */
    requestBinary(
        method: string,
        path: string,
        body?: unknown,
        withAuth = true,
    ): Promise<ArrayBuffer> {
        return this._requestBinary(method, path, body, withAuth);
    }

    /**
     * multipart/form-data 요청을 보냅니다. 파일 업로드 등에 사용합니다.
     * 응답은 JSON으로 파싱하여 반환합니다.
     */
    requestForm<T>(
        method: string,
        path: string,
        form: FormData,
        withAuth = true,
    ): Promise<T> {
        return this._requestForm<T>(method, path, form, withAuth);
    }

    /**
     * multipart/form-data 요청을 보내고 바이너리(ArrayBuffer)를 반환합니다.
     */
    requestFormBinary(
        method: string,
        path: string,
        form: FormData,
        withAuth = true,
    ): Promise<ArrayBuffer> {
        return this._requestFormBinary(method, path, form, withAuth);
    }

    _request<T>(
        method: string,
        path: string,
        body?: unknown,
        withAuth = true,
        extraHeaders?: Record<string, string>,
    ): Promise<T> {
        return entityRequest<T>(
            this._reqOpts,
            method,
            path,
            body,
            withAuth,
            extraHeaders,
            true,
        );
    }

    /** PNG/바이너리 응답을 ArrayBuffer로 반환합니다. (QR, 바코드 등) */
    async _requestBinary(
        method: string,
        path: string,
        body?: unknown,
        withAuth = true,
    ): Promise<ArrayBuffer> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (withAuth && this.token)
            headers["Authorization"] = `Bearer ${this.token}`;
        if (this.apiKey) headers["X-API-Key"] = this.apiKey;

        const res = await fetch(this.baseUrl + path, {
            method,
            headers,
            ...(body != null ? { body: JSON.stringify(body) } : {}),
            credentials: "include",
        });

        if (!res.ok) {
            const text = await res.text();
            const err = new Error(`HTTP ${res.status}: ${text}`);
            (err as { status?: number }).status = res.status;
            throw err;
        }

        return res.arrayBuffer();
    }

    /** multipart/form-data 요청을 보냅니다. (파일 업로드 등) */
    async _requestForm<T>(
        method: string,
        path: string,
        form: FormData,
        withAuth = true,
    ): Promise<T> {
        const headers: Record<string, string> = {};
        if (withAuth && this.token)
            headers["Authorization"] = `Bearer ${this.token}`;
        if (this.apiKey) headers["X-API-Key"] = this.apiKey;

        const res = await fetch(this.baseUrl + path, {
            method,
            headers,
            body: form,
            credentials: "include",
        });

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

    /** multipart/form-data 요청을 보내고 바이너리(ArrayBuffer)를 반환합니다. */
    async _requestFormBinary(
        method: string,
        path: string,
        form: FormData,
        withAuth = true,
    ): Promise<ArrayBuffer> {
        const headers: Record<string, string> = {};
        if (withAuth && this.token)
            headers["Authorization"] = `Bearer ${this.token}`;
        if (this.apiKey) headers["X-API-Key"] = this.apiKey;

        const res = await fetch(this.baseUrl + path, {
            method,
            headers,
            body: form,
            credentials: "include",
        });

        if (!res.ok) {
            const text = await res.text();
            const err = new Error(`HTTP ${res.status}: ${text}`);
            (err as { status?: number }).status = res.status;
            throw err;
        }

        return res.arrayBuffer();
    }
}
