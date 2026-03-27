import { buildQuery } from "../../../client/utils.js";
import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function OAuthMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class OAuthMixinClass extends Base {
        oauthAuthorizeUrl(
            provider: string,
            query: Record<string, unknown> = {},
        ): string {
            const qs = buildQuery(query);
            return `${this.baseUrl}/v1/oauth/${provider}${qs ? `?${qs}` : ""}`;
        }

        oauthCallback<T = unknown>(
            provider: string,
            payload?: Record<string, unknown>,
            method: "GET" | "POST" = "POST",
        ): Promise<T> {
            if (method === "GET") {
                const qs = buildQuery(payload ?? {});
                return this.http.get(
                    `/v1/oauth/${provider}/callback${qs ? `?${qs}` : ""}`,
                    false,
                );
            }

            return this.http.post(
                `/v1/oauth/${provider}/callback`,
                payload,
                false,
            );
        }

        linkOAuthAccount<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/account/oauth/link", body);
        }

        unlinkOAuthAccount<T = unknown>(provider: string): Promise<T> {
            return this.http.delete(
                `/v1/account/oauth/link/${provider}`,
            );
        }

        listOAuthProviders<T = unknown>(): Promise<T> {
            return this.http.get("/v1/account/oauth/providers");
        }

        refreshOAuthProviderToken<T = unknown>(
            provider: string,
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/account/oauth/refresh/${provider}`,
                body,
            );
        }
    };
}
