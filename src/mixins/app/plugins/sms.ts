import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function SmsMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class SmsMixinClass extends Base {
        /** SMS/LMS/MMS를 발송합니다. */
        smsSend<T = unknown>(body: Record<string, unknown>): Promise<T> {
            return this.http.post("/v1/sms/send", body);
        }

        /** SMS 발송 상태를 조회합니다. */
        smsStatus<T = unknown>(seq: number): Promise<T> {
            return this.http.get(
                `/v1/sms/status/${seq}`,
                false,
            );
        }

        /** SMS 인증번호를 발송합니다. */
        smsVerificationSend<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/sms/verification/send",
                body,
                false,
            );
        }

        /** SMS 인증번호를 검증합니다. */
        smsVerificationVerify<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/sms/verification/verify",
                body,
                false,
            );
        }
    };
}
