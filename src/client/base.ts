import type {
    EntityServerClientOptions,
    RealtimeClientOptions,
    RealtimeConnectionStatus,
    RealtimeEnvelope,
    RealtimeMessageListener,
    RealtimeStatusListener,
} from "../types.js";
import { readEnv } from "./utils.js";
import { derivePacketKey, parseRequestBody } from "./packet.js";
import {
    entityRequest,
    type EntityRequestConfig,
    type RequestOptions,
} from "./request.js";

const REALTIME_DEFAULT_PATH = "/v1/realtime";

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
    csrfRefresher: (() => Promise<void>) | null = null;
    requestAbortControllers = new Map<string, AbortController>();
    activeTxId: string | null = null;

    // 세션 유지 관련
    keepSession: boolean;
    refreshBuffer: number;
    onTokenRefreshed?: (accessToken: string, expiresIn: number) => void;
    onSessionExpired?: (error: Error) => void;
    onHealthChange?: (online: boolean) => void;
    sessionRefreshToken: string | null = null;
    refreshTimer: ReturnType<typeof setTimeout> | null = null;
    healthTickTimer: ReturnType<typeof setInterval> | null = null;
    healthTickPromise: Promise<unknown> | null = null;
    realtimeEnabled: boolean;
    realtimePath: string;
    realtimeAutoReconnect: boolean;
    realtimeReconnectDelayMs: number;
    realtimeStatus: RealtimeConnectionStatus;
    realtimeSocket: WebSocket | null = null;
    realtimeConnectPromise: Promise<void> | null = null;
    realtimeReconnectTimer: ReturnType<typeof setTimeout> | null = null;
    realtimeShouldReconnect = false;
    realtimeMessageListeners = new Set<RealtimeMessageListener>();
    realtimeStatusListeners = new Set<RealtimeStatusListener>();
    realtimeEventListeners = new Map<string, Set<RealtimeMessageListener>>();
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
        this.realtimeEnabled = false;
        this.realtimePath = REALTIME_DEFAULT_PATH;
        this.realtimeAutoReconnect = true;
        this.realtimeReconnectDelayMs = 3000;
        this.realtimeStatus = "idle";
        this.applyRealtimeOptions(options.realtime);
        if (
            typeof options.healthTickInterval === "number" &&
            options.healthTickInterval > 0
        ) {
            // csrfRefresher는 AuthMixin에서 설정되므로 다음 tick에 시작
            Promise.resolve().then(() =>
                this.startHealthTick(options.healthTickInterval, false),
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
        if (typeof options.realtime !== "undefined") {
            this.applyRealtimeOptions(options.realtime);
        }
        if (
            typeof options.healthTickInterval === "number" &&
            options.healthTickInterval > 0
        ) {
            Promise.resolve().then(() =>
                this.startHealthTick(options.healthTickInterval, false),
            );
        }
    }

    /** 인증 요청에 사용할 JWT Access Token을 설정합니다. */
    setToken(token: string): void {
        this.token = token;
        if (!token) {
            this.disconnectRealtime("token_cleared");
        }
    }

    /** 응답 헤더로 받은 access token 갱신을 반영한다. */
    setAccessTokenFromResponse(token: string): void {
        this.token = token;
        if (!token) {
            this.disconnectRealtime("token_cleared");
        }
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

    addRealtimeListener(listener: RealtimeMessageListener): void {
        this.realtimeMessageListeners.add(listener);
    }

    removeRealtimeListener(listener: RealtimeMessageListener): void {
        this.realtimeMessageListeners.delete(listener);
    }

    addRealtimeStatusListener(listener: RealtimeStatusListener): void {
        this.realtimeStatusListeners.add(listener);
    }

    removeRealtimeStatusListener(listener: RealtimeStatusListener): void {
        this.realtimeStatusListeners.delete(listener);
    }

    addRealtimeEventListener(
        eventName: string,
        listener: RealtimeMessageListener,
    ): void {
        const key = String(eventName).trim();
        if (!key) {
            return;
        }
        if (!this.realtimeEventListeners.has(key)) {
            this.realtimeEventListeners.set(key, new Set());
        }
        this.realtimeEventListeners.get(key)!.add(listener);
    }

    removeRealtimeEventListener(
        eventName: string,
        listener: RealtimeMessageListener,
    ): void {
        const key = String(eventName).trim();
        if (!key) {
            return;
        }
        const listeners = this.realtimeEventListeners.get(key);
        if (!listeners) {
            return;
        }
        listeners.delete(listener);
        if (listeners.size === 0) {
            this.realtimeEventListeners.delete(key);
        }
    }

    async connectRealtime(): Promise<void> {
        if (!this.realtimeEnabled) {
            this.setRealtimeStatus("disabled", "realtime_disabled");
            return;
        }

        if (!this.token) {
            throw new Error(
                "Cannot open realtime connection without access token.",
            );
        }

        if (typeof WebSocket === "undefined") {
            throw new Error("WebSocket is not available in this environment.");
        }

        if (
            this.realtimeSocket &&
            this.realtimeSocket.readyState === WebSocket.OPEN
        ) {
            return;
        }

        if (
            this.realtimeSocket &&
            this.realtimeSocket.readyState === WebSocket.CONNECTING &&
            this.realtimeConnectPromise
        ) {
            return this.realtimeConnectPromise;
        }

        this.clearRealtimeReconnectTimer();
        this.realtimeShouldReconnect = this.realtimeAutoReconnect;
        this.setRealtimeStatus("connecting", "connect_requested");

        const socket = new WebSocket(this.buildRealtimeUrl());
        this.realtimeSocket = socket;

        this.realtimeConnectPromise = new Promise<void>((resolve, reject) => {
            let settled = false;

            const finalizeResolve = () => {
                if (settled) {
                    return;
                }
                settled = true;
                this.realtimeConnectPromise = null;
                resolve();
            };

            const finalizeReject = (error: Error) => {
                if (settled) {
                    return;
                }
                settled = true;
                this.realtimeConnectPromise = null;
                reject(error);
            };

            socket.addEventListener("open", () => {
                this.setRealtimeStatus("open", "socket_open");
                finalizeResolve();
            });

            socket.addEventListener("message", (event) => {
                this.handleRealtimeMessage(event.data);
            });

            socket.addEventListener("error", () => {
                this.setRealtimeStatus(
                    "closed",
                    "socket_error",
                    new Error("Realtime socket error."),
                );
            });

            socket.addEventListener("close", (event) => {
                if (this.realtimeSocket === socket) {
                    this.realtimeSocket = null;
                }

                const reason = event.reason || "socket_closed";
                const error = new Error(
                    `Realtime socket closed (${event.code}${event.reason ? `: ${event.reason}` : ""}).`,
                );

                this.setRealtimeStatus("closed", reason, error);
                if (!settled) {
                    finalizeReject(error);
                }

                if (
                    this.realtimeShouldReconnect &&
                    this.realtimeEnabled &&
                    this.realtimeAutoReconnect &&
                    this.token
                ) {
                    this.scheduleRealtimeReconnect(reason);
                }
            });
        });

        return this.realtimeConnectPromise;
    }

    disconnectRealtime(reason = "client_disconnect"): void {
        this.realtimeShouldReconnect = false;
        this.clearRealtimeReconnectTimer();

        if (this.realtimeSocket) {
            const socket = this.realtimeSocket;
            this.realtimeSocket = null;
            try {
                if (
                    socket.readyState === WebSocket.OPEN ||
                    socket.readyState === WebSocket.CONNECTING
                ) {
                    socket.close(1000, reason);
                }
            } catch {
                // ignore close errors
            }
        }

        this.realtimeConnectPromise = null;
        this.setRealtimeStatus(
            this.realtimeEnabled ? "idle" : "disabled",
            reason,
        );
    }

    sendRealtime(message: RealtimeEnvelope | Record<string, unknown>): boolean {
        if (
            !this.realtimeSocket ||
            this.realtimeSocket.readyState !== WebSocket.OPEN
        ) {
            return false;
        }

        this.realtimeSocket.send(JSON.stringify(message));
        return true;
    }

    subscribeRealtime(subscriptions: string[]): boolean {
        return this.sendRealtime({
            type: "subscribe",
            channel: "session",
            event: "session.subscribe",
            data: { subscriptions },
        });
    }

    unsubscribeRealtime(subscriptions: string[]): boolean {
        return this.sendRealtime({
            type: "unsubscribe",
            channel: "session",
            event: "session.unsubscribe",
            data: { subscriptions },
        });
    }

    /**
     * 주기적으로 health 체크를 실행합니다.
     * CSRF 쿠키 갱신과 서버 상태 확인을 자동화합니다.
     * keepSession=true 이면 각 tick에서 세션 부트스트랩도 함께 시도합니다.
     *
     * @param intervalMs 호출 주기(ms). 기본값: 5분
     * @param runImmediately true면 시작 직후 첫 tick을 즉시 실행합니다.
     */
    startHealthTick(
        intervalMs: number = 5 * 60 * 1000,
        runImmediately = true,
    ): void {
        this.stopHealthTick();
        const tick = (): void => {
            if (this.healthTickPromise) return;
            this.healthTickPromise = (
                this.csrfRefresher ? this.csrfRefresher() : Promise.resolve()
            )
                .then(() => {
                    this.onHealthChange?.(true);
                })
                .catch(() => {
                    this.onHealthChange?.(false);
                })
                .finally(() => {
                    this.healthTickPromise = null;
                });
        };
        if (runImmediately) {
            tick();
        }
        this.healthTickTimer = setInterval(tick, intervalMs);
    }

    /** health tick 타이머를 중지합니다. */
    stopHealthTick(): void {
        if (this.healthTickTimer !== null) {
            clearInterval(this.healthTickTimer);
            this.healthTickTimer = null;
        }
        this.healthTickPromise = null;
    }

    // ─── 세션 유지 ────────────────────────────────────────────────────────────

    /** @deprecated 세션 연장은 health tick 기반 부트스트랩으로 대체되었습니다. */
    scheduleKeepSession(
        refreshToken: string,
        expiresIn: number,
        refreshFn: (
            rt: string,
        ) => Promise<{ access_token: string; expires_in: number }>,
    ): void {
        this.clearRefreshTimer();
        this.sessionRefreshToken = refreshToken;
        const delayMs = Math.max((expiresIn - this.refreshBuffer) * 1000, 0);
        this.refreshTimer = setTimeout(async () => {
            if (!this.sessionRefreshToken) return;
            try {
                const result = await refreshFn(this.sessionRefreshToken);
                this.onTokenRefreshed?.(result.access_token, result.expires_in);
                this.scheduleKeepSession(
                    this.sessionRefreshToken,
                    result.expires_in,
                    refreshFn,
                );
            } catch (err) {
                this.clearRefreshTimer();
                this.onSessionExpired?.(
                    err instanceof Error ? err : new Error(String(err)),
                );
            }
        }, delayMs);
    }

    /** @deprecated 세션 연장은 health tick 기반 부트스트랩으로 대체되었습니다. */
    clearRefreshTimer(): void {
        if (this.refreshTimer !== null) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * 세션 자동 연장을 중지합니다.
     * `logout()` 호출 시 자동으로 중지되며, 직접 호출이 필요한 경우는 드뭅니다.
     */
    stopKeepSession(): void {
        this.clearRefreshTimer();
        this.sessionRefreshToken = null;
    }

    applyRealtimeOptions(options?: boolean | RealtimeClientOptions): void {
        const normalized: RealtimeClientOptions =
            typeof options === "boolean"
                ? { enabled: options }
                : (options ?? {});

        this.realtimeEnabled = normalized.enabled ?? false;
        this.realtimePath =
            String(normalized.path ?? REALTIME_DEFAULT_PATH).trim() ||
            REALTIME_DEFAULT_PATH;
        this.realtimeAutoReconnect = normalized.autoReconnect ?? true;
        this.realtimeReconnectDelayMs = Math.max(
            250,
            normalized.reconnectDelayMs ?? 3000,
        );

        if (!this.realtimeEnabled) {
            this.disconnectRealtime("realtime_disabled");
            return;
        }

        this.setRealtimeStatus("idle", "realtime_enabled");
    }

    buildRealtimeUrl(): string {
        const rawBaseUrl =
            this.baseUrl || readEnv("VITE_ENTITY_SERVER_URL") || "";
        const origin =
            typeof window !== "undefined" ? window.location.origin : "";
        const baseUrl = rawBaseUrl || origin;

        if (!baseUrl) {
            throw new Error("Realtime connection requires baseUrl.");
        }

        const url = new URL(baseUrl, origin || undefined);
        const basePath =
            url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
        const realtimePath = `/${this.realtimePath.replace(/^\/+/, "")}`;

        url.pathname = `${basePath}${realtimePath}` || realtimePath;
        url.search = "";
        url.hash = "";
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        url.searchParams.set("access_token", this.token);
        return url.toString();
    }

    handleRealtimeMessage(payload: unknown): void {
        if (typeof payload !== "string") {
            return;
        }

        let envelope: RealtimeEnvelope;
        try {
            envelope = JSON.parse(payload) as RealtimeEnvelope;
        } catch {
            return;
        }

        for (const listener of this.realtimeMessageListeners) {
            listener(envelope);
        }

        const listeners = this.realtimeEventListeners.get(envelope.event);
        if (listeners) {
            for (const listener of listeners) {
                listener(envelope);
            }
        }
    }

    scheduleRealtimeReconnect(reason: string): void {
        this.clearRealtimeReconnectTimer();
        this.realtimeReconnectTimer = setTimeout(() => {
            this.realtimeReconnectTimer = null;
            if (!this.realtimeEnabled || !this.token) {
                return;
            }
            this.setRealtimeStatus("connecting", `${reason}:reconnect`);
            void this.connectRealtime().catch(() => {});
        }, this.realtimeReconnectDelayMs);
    }

    clearRealtimeReconnectTimer(): void {
        if (this.realtimeReconnectTimer !== null) {
            clearTimeout(this.realtimeReconnectTimer);
            this.realtimeReconnectTimer = null;
        }
    }

    setRealtimeStatus(
        status: RealtimeConnectionStatus,
        reason?: string,
        error?: Error,
    ): void {
        const previousStatus = this.realtimeStatus;
        if (
            previousStatus === status &&
            typeof reason === "undefined" &&
            typeof error === "undefined"
        ) {
            return;
        }

        this.realtimeStatus = status;
        for (const listener of this.realtimeStatusListeners) {
            listener({
                status,
                previousStatus,
                ...(reason ? { reason } : {}),
                ...(error ? { error } : {}),
            });
        }
    }

    applyCsrfHealth(): void {
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

    get reqOpts(): RequestOptions {
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
            refreshCsrfCookie: this.csrfEnabled ? this.csrfRefresher : null,
            requestAbortControllers: this.requestAbortControllers,
            onAccessToken: (token) => {
                this.setAccessTokenFromResponse(token);
            },
        };
    }

    // 인증 요청 전에 필요한 클라이언트 준비 작업을 수행합니다.
    prepareRequest(_withAuth: boolean): Promise<void> {
        return Promise.resolve();
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
                requestConfig?: EntityRequestConfig,
            ): Promise<T> {
                return self
                    .prepareRequest(withAuth)
                    .then(() =>
                        entityRequest<T>(
                            self.reqOpts,
                            "GET",
                            path,
                            undefined,
                            withAuth,
                            extraHeaders,
                            requestConfig ?? true,
                        ),
                    );
            },
            post<T>(
                path: string,
                body?: unknown,
                withAuth = true,
                extraHeaders?: Record<string, string>,
                requestConfig?: EntityRequestConfig,
            ): Promise<T> {
                return self
                    .prepareRequest(withAuth)
                    .then(() =>
                        entityRequest<T>(
                            self.reqOpts,
                            "POST",
                            path,
                            body,
                            withAuth,
                            extraHeaders,
                            requestConfig ?? true,
                        ),
                    );
            },
            put<T>(
                path: string,
                body?: unknown,
                withAuth = true,
                extraHeaders?: Record<string, string>,
                requestConfig?: EntityRequestConfig,
            ): Promise<T> {
                return self
                    .prepareRequest(withAuth)
                    .then(() =>
                        entityRequest<T>(
                            self.reqOpts,
                            "PUT",
                            path,
                            body,
                            withAuth,
                            extraHeaders,
                            requestConfig ?? true,
                        ),
                    );
            },
            patch<T>(
                path: string,
                body?: unknown,
                withAuth = true,
                extraHeaders?: Record<string, string>,
                requestConfig?: EntityRequestConfig,
            ): Promise<T> {
                return self
                    .prepareRequest(withAuth)
                    .then(() =>
                        entityRequest<T>(
                            self.reqOpts,
                            "PATCH",
                            path,
                            body,
                            withAuth,
                            extraHeaders,
                            requestConfig ?? true,
                        ),
                    );
            },
            delete<T>(
                path: string,
                body?: unknown,
                withAuth = true,
                extraHeaders?: Record<string, string>,
                requestConfig?: EntityRequestConfig,
            ): Promise<T> {
                return self
                    .prepareRequest(withAuth)
                    .then(() =>
                        entityRequest<T>(
                            self.reqOpts,
                            "DELETE",
                            path,
                            body,
                            withAuth,
                            extraHeaders,
                            requestConfig ?? true,
                        ),
                    );
            },
        };
    }

    request<T>(
        method: string,
        path: string,
        body?: unknown,
        withAuth = true,
        extraHeaders?: Record<string, string>,
        requestConfig?: EntityRequestConfig,
    ): Promise<T> {
        return this.prepareRequest(withAuth).then(() =>
            entityRequest<T>(
                this.reqOpts,
                method,
                path,
                body,
                withAuth,
                extraHeaders,
                requestConfig ?? true,
            ),
        );
    }

    /** PNG/바이너리 응답을 ArrayBuffer로 반환합니다. (QR, 바코드 등) */
    async requestBinary(
        method: string,
        path: string,
        body?: unknown,
        withAuth = true,
    ): Promise<ArrayBuffer> {
        await this.prepareRequest(withAuth);

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
    async requestForm<T>(
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
    async requestFormBinary(
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
