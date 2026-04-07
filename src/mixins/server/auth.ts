import type {
    GConstructor,
    EntityServerClientBase,
} from "../../client/base.js";
import { entityRequest } from "../../client/request.js";

export interface AuthLoginSuccessData {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    force_password_change?: boolean;
    password_expired?: boolean;
    password_expires_in_days?: number;
}

export interface AuthLoginSuccessResponse {
    ok: true;
    data: AuthLoginSuccessData;
    requires_2fa?: false;
}

export interface AuthLoginRequiresTwoFactorResponse {
    ok: true;
    requires_2fa: true;
    data: {
        two_factor_token: string;
        expires_in: number;
    };
}

export interface AuthLoginSetupRequiredResponse {
    ok: false;
    error: "2fa_setup_required";
    message: string;
    data: {
        setup_token: string;
        expires_in: number;
    };
}

export type AuthLoginResponse =
    | AuthLoginSuccessResponse
    | AuthLoginRequiresTwoFactorResponse
    | AuthLoginSetupRequiredResponse;

export function isAuthLoginSuccessResponse(
    response: AuthLoginResponse,
): response is AuthLoginSuccessResponse {
    return (
        response.ok === true &&
        response.requires_2fa !== true &&
        typeof response.data === "object" &&
        response.data !== null &&
        "access_token" in response.data
    );
}

export function AuthMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class AuthMixinClass extends Base {
        authBootstrapPromise: Promise<void> | null = null;
        authBootstrapToken = "";
        authBootstrapAnonymousCompleted = false;

        // health tick이 켜져 있으면 keepSession 여부에 따라 세션 부트스트랩까지 함께 처리합니다.
        csrfRefresher = (): Promise<void> =>
            this.checkHealth(this.keepSession).then(() => {});

        // ─── 인증 ─────────────────────────────────────────────────────────────

        /**
         * 서버 헬스 체크를 수행하고 패킷 암호화 활성 여부를 자동으로 감지합니다.
         *
         * 서버가 `packet_encryption: true`를 응답하면 이후 모든 요청에 암호화가 자동 적용됩니다.
         *
         * ```ts
         * await client.checkHealth();
         * await client.login(email, password);
         * ```
         */
        async checkHealth(bootstrapAuth = false): Promise<{
            status: string;
            authenticated?: boolean;
            packet_encryption?: boolean;
        }> {
            try {
                const previousToken = this.token;
                const headers: Record<string, string> = {};
                if (bootstrapAuth) {
                    headers["X-Session-Bootstrap"] = "1";
                }

                const res = await fetch(`${this.baseUrl}/v1/health`, {
                    signal: AbortSignal.timeout(3000),
                    credentials: "include",
                    headers,
                });
                const data = (await res.json()) as {
                    status: string;
                    authenticated?: boolean;
                    packet_encryption?: boolean;
                };

                const accessToken = res.headers.get("X-Access-Token");
                if (accessToken) {
                    this.token = accessToken;
                    if (bootstrapAuth && accessToken !== previousToken) {
                        this.onTokenRefreshed?.(accessToken, 0);
                    }
                    if (
                        bootstrapAuth &&
                        data.authenticated === true &&
                        this.realtimeEnabled &&
                        this.realtimeAutoConnect
                    ) {
                        this.connectRealtime().catch(() => {});
                    }
                }

                // 패킷 암호화는 health 응답이 명시적으로 활성이라고 알려줄 때만 자동 활성화한다.
                const anonToken = this.readCookie("anon_token");
                if (data.packet_encryption === true && anonToken) {
                    this.anonymousPacketToken = anonToken;
                    this.encryptRequests = true;
                }

                this.applyCsrfHealth();
                this.onHealthChange?.(true);
                if (
                    bootstrapAuth &&
                    data.authenticated === false &&
                    previousToken
                ) {
                    this.disconnectRealtime("session_expired");
                    this.onSessionExpired?.(new Error("Session expired"));
                }
                return data;
            } catch (error) {
                this.onHealthChange?.(false);
                throw error;
            }
        }

        /** document.cookie 또는 Node 환경에서 쿠키 값 읽기 (SSR 대응) */
        readCookie(name: string): string | null {
            if (typeof document === "undefined") return null;
            const match = document.cookie
                .split(";")
                .map((c) => c.trim())
                .find((c) => c.startsWith(`${name}=`));
            if (!match) return null;
            try {
                return decodeURIComponent(match.slice(name.length + 1));
            } catch {
                return match.slice(name.length + 1);
            }
        }

        async ensurePublicAuthBootstrap(): Promise<void> {
            if (typeof document === "undefined") {
                return;
            }

            if (this.apiKey && this.hmacSecret) {
                return;
            }

            const hasAnonymousPacketToken =
                !!this.anonymousPacketToken || !!this.readCookie("anon_token");
            const hasCsrfCookie = !!this.readCookie(this.csrfCookieName);

            if (hasAnonymousPacketToken && hasCsrfCookie && this.csrfEnabled) {
                return;
            }

            await this.checkHealth(false);
        }

        // 인증 요청 전에 health 기반 세션 부트스트랩을 한 번 보장합니다.
        async ensureAuthenticatedRequestBootstrap(): Promise<void> {
            if (typeof document === "undefined") {
                return;
            }

            if (this.apiKey && this.hmacSecret) {
                return;
            }

            if (this.token) {
                if (this.authBootstrapToken === this.token) {
                    return;
                }
            } else if (this.authBootstrapAnonymousCompleted) {
                return;
            }

            if (this.authBootstrapPromise) {
                return this.authBootstrapPromise;
            }

            this.authBootstrapPromise = this.checkHealth(true)
                .then(() => {
                    if (this.token) {
                        this.authBootstrapToken = this.token;
                    } else {
                        this.authBootstrapAnonymousCompleted = true;
                    }
                })
                .finally(() => {
                    this.authBootstrapPromise = null;
                });

            return this.authBootstrapPromise;
        }

        // 인증 요청 전 자동 health 부트스트랩을 수행합니다.
        override async prepareRequest(withAuth: boolean): Promise<void> {
            await super.prepareRequest(withAuth);
            if (!withAuth) {
                return;
            }

            await this.ensureAuthenticatedRequestBootstrap();
        }

        /** 로그인 응답을 반환합니다. 성공 시에만 `access_token`을 내부 상태에 저장합니다. */
        async login(
            email: string,
            password: string,
        ): Promise<AuthLoginResponse> {
            await this.ensurePublicAuthBootstrap();

            const response = await entityRequest<AuthLoginResponse>(
                this.reqOpts,
                "POST",
                "/v1/auth/login",
                { email, passwd: password },
                false,
                {},
                { requireOkShape: false, allowStatuses: [403] },
            );

            if (isAuthLoginSuccessResponse(response)) {
                this.token = response.data.access_token;
                this.applyCsrfHealth();
                if (this.keepSession && this.healthTickTimer === null) {
                    this.startHealthTick();
                }
                if (this.realtimeEnabled && this.realtimeAutoConnect) {
                    this.connectRealtime().catch(() => {});
                }
            }

            return response;
        }

        /** HttpOnly refresh cookie로 Access Token을 재발급받아 내부 토큰을 교체합니다. */
        async tokenRefresh(): Promise<{
            access_token: string;
            refresh_token: string;
            expires_in: number;
        }> {
            const data = await this.request<{
                data: {
                    access_token: string;
                    refresh_token: string;
                    expires_in: number;
                };
            }>("POST", "/v1/auth/token_refresh", undefined, false);
            this.token = data.data.access_token;
            this.applyCsrfHealth();
            return data.data;
        }

        /** Refresh Token으로 Access Token을 재발급받아 내부 토큰을 교체합니다. */
        async refreshToken(refreshToken?: string): Promise<{
            access_token: string;
            refresh_token?: string;
            expires_in: number;
        }> {
            if (!refreshToken) {
                return this.tokenRefresh();
            }

            const data = await this.request<{
                data: {
                    access_token: string;
                    refresh_token: string;
                    expires_in: number;
                };
            }>(
                "POST",
                "/v1/auth/refresh",
                { refresh_token: refreshToken },
                false,
            );
            this.token = data.data.access_token;
            this.applyCsrfHealth();
            return data.data;
        }

        /**
         * 서버에 로그아웃을 요청하고 내부 토큰을 초기화합니다.
         * refresh_token을 서버에 전달해 무효화합니다.
         */
        async logout(refreshToken?: string): Promise<{ ok: boolean }> {
            this.stopKeepSession();
            this.stopHealthTick();
            this.disconnectRealtime("logout");
            const data = await this.request<{ ok: boolean }>(
                "POST",
                "/v1/auth/logout",
                refreshToken ? { refresh_token: refreshToken } : undefined,
                false,
            );
            this.token = "";
            this.applyCsrfHealth();
            return data;
        }

        /** 현재 로그인된 사용자 정보를 반환합니다. */
        me<T = Record<string, unknown>>(): Promise<{ ok: boolean; data: T }> {
            return this.request("GET", "/v1/auth/me");
        }

        /** 회원 탈퇴를 요청합니다. */
        withdraw(passwd?: string): Promise<{ ok: boolean }> {
            return this.request(
                "POST",
                "/v1/auth/withdraw",
                passwd ? { passwd } : {},
            );
        }
    };
}
