import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function AccountAppMixin<
    TBase extends GConstructor<EntityServerClientBase>,
>(Base: TBase) {
    return class AccountAppMixinClass extends Base {
        accountRegister<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/account/register",
                body,
                false,
            );
        }

        accountWithdraw<T = unknown>(
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/account/withdraw", body);
        }

        accountChangePassword<T = unknown>(body: {
            current_password: string;
            new_password: string;
        }): Promise<T> {
            return this.http.post(
                "/v1/account/change-password",
                body,
            );
        }

        accountReactivate<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/account/reactivate",
                body,
                false,
            );
        }

        listAccountBiometrics<T = unknown>(): Promise<T> {
            return this.http.get("/v1/account/biometric");
        }

        registerAccountBiometric<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/account/biometric", body);
        }

        deleteAccountBiometric<T = unknown>(seq: number): Promise<T> {
            return this.http.delete(`/v1/account/biometric/${seq}`);
        }
    };
}
