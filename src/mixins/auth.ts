import type { GConstructor, EntityServerClientBase } from "../client/base.js";

export function AuthMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class AuthMixinClass extends Base {
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
        async checkHealth(): Promise<{
            ok: boolean;
            packet_encryption?: boolean;
            packet_mode?: string;
            packet_token?: string;
            csrf?: import("../types").EntityServerClientHealthCsrf;
        }> {
            const res = await fetch(`${this.baseUrl}/v1/health`, {
                signal: AbortSignal.timeout(3000),
                credentials: "include",
            });
            const data = (await res.json()) as {
                ok: boolean;
                packet_encryption?: boolean;
                packet_mode?: string;
                packet_token?: string;
                csrf?: import("../types").EntityServerClientHealthCsrf;
            };
            if (data.packet_encryption) this.encryptRequests = true;
            if (typeof data.packet_token === "string") {
                this.anonymousPacketToken = data.packet_token;
            }
            this._applyCsrfHealth(data.csrf);
            return data;
        }

        /** 로그인 후 `access_token`을 내부 상태에 저장합니다. */
        async login(
            email: string,
            password: string,
        ): Promise<{
            access_token: string;
            refresh_token: string;
            expires_in: number;
            force_password_change?: boolean;
            password_expired?: boolean;
            password_expires_in_days?: number;
        }> {
            const data = await this._request<{
                data: {
                    access_token: string;
                    refresh_token: string;
                    expires_in: number;
                    force_password_change?: boolean;
                    password_expired?: boolean;
                    password_expires_in_days?: number;
                };
            }>("POST", "/v1/auth/login", { email, passwd: password }, false);
            this.token = data.data.access_token;
            if (this.keepSession)
                this._scheduleKeepSession(
                    data.data.refresh_token,
                    data.data.expires_in,
                    (rt) => this.refreshToken(rt),
                );
            return data.data;
        }

        /** Refresh Token으로 Access Token을 재발급받아 내부 토큰을 교체합니다. */
        async refreshToken(
            refreshToken: string,
        ): Promise<{ access_token: string; expires_in: number }> {
            const data = await this._request<{
                data: { access_token: string; expires_in: number };
            }>(
                "POST",
                "/v1/auth/refresh",
                { refresh_token: refreshToken },
                false,
            );
            this.token = data.data.access_token;
            if (this.keepSession)
                this._scheduleKeepSession(
                    refreshToken,
                    data.data.expires_in,
                    (rt) => this.refreshToken(rt),
                );
            return data.data;
        }

        /**
         * 서버에 로그아웃을 요청하고 내부 토큰을 초기화합니다.
         * refresh_token을 서버에 전달해 무효화합니다.
         */
        async logout(refreshToken: string): Promise<{ ok: boolean }> {
            this.stopKeepSession();
            const data = await this._request<{ ok: boolean }>(
                "POST",
                "/v1/auth/logout",
                { refresh_token: refreshToken },
                false,
            );
            this.token = "";
            return data;
        }

        /** 현재 로그인된 사용자 정보를 반환합니다. */
        me<T = Record<string, unknown>>(): Promise<{ ok: boolean; data: T }> {
            return this._request("GET", "/v1/auth/me");
        }

        /** 회원 탈퇴를 요청합니다. */
        withdraw(passwd?: string): Promise<{ ok: boolean }> {
            return this._request(
                "POST",
                "/v1/auth/withdraw",
                passwd ? { passwd } : {},
            );
        }

        /**
         * 휴면 계정을 재활성화합니다.
         * 비밀번호 또는 OAuth(provider + code)로 본인 확인합니다.
         */
        reactivate(params: {
            email: string;
            passwd?: string;
            provider?: string;
            code?: string;
        }): Promise<{
            access_token: string;
            refresh_token: string;
            expires_in: number;
        }> {
            return this._request("POST", "/v1/auth/reactivate", params, false);
        }
    };
}
