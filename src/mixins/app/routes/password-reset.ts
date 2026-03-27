import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function PasswordResetMixin<
    TBase extends GConstructor<EntityServerClientBase>,
>(Base: TBase) {
    return class PasswordResetMixinClass extends Base {
        requestPasswordReset<T = unknown>(
            body: { email: string } | Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/password-reset/request",
                body,
                false,
            );
        }

        validatePasswordResetToken<T = unknown>(token: string): Promise<T> {
            return this.http.get(
                `/v1/password-reset/validate/${encodeURIComponent(token)}`,
                false,
            );
        }

        verifyPasswordReset<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/password-reset/verify",
                body,
                false,
            );
        }
    };
}
