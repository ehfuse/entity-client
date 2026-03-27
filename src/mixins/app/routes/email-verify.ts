import { buildQuery } from "../../../client/utils.js";
import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function EmailVerifyMixin<
    TBase extends GConstructor<EntityServerClientBase>,
>(Base: TBase) {
    return class EmailVerifyMixinClass extends Base {
        sendEmailVerification<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/email-verify/send",
                body,
                false,
            );
        }

        confirmEmailVerification<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/email-verify/confirm",
                body,
                false,
            );
        }

        activateEmailVerification<T = unknown>(
            query: Record<string, unknown>,
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/email-verify/activate${qs ? `?${qs}` : ""}`,
                false,
            );
        }

        getEmailVerificationStatus<T = unknown>(): Promise<T> {
            return this.http.get("/v1/email-verify/status");
        }

        changeVerifiedEmail<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/email-verify/change", body);
        }
    };
}
