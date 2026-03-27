import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function TwoFactorMixin<
    TBase extends GConstructor<EntityServerClientBase>,
>(Base: TBase) {
    return class TwoFactorMixinClass extends Base {
        setupTwoFactor<T = unknown>(
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/account/2fa/setup", body);
        }

        verifyTwoFactorSetup<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/account/2fa/setup/verify",
                body,
                false,
            );
        }

        disableTwoFactor<T = unknown>(): Promise<T> {
            return this.http.delete("/v1/account/2fa");
        }

        getTwoFactorStatus<T = unknown>(): Promise<T> {
            return this.http.get("/v1/account/2fa/status");
        }

        regenerateTwoFactorRecoveryCodes<T = unknown>(): Promise<T> {
            return this.http.post(
                "/v1/account/2fa/recovery/regenerate",
            );
        }

        verifyTwoFactor<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/account/2fa/verify",
                body,
                false,
            );
        }

        recoverTwoFactorAccess<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/account/2fa/recovery",
                body,
                false,
            );
        }
    };
}
