import type { SmtpSendRequest } from "../types";
import type { GConstructor, EntityServerClientBase } from "../client/base";

export function SmtpMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class SmtpMixinClass extends Base {
        // ─── SMTP 메일 발송 ───────────────────────────────────────────────────

        /** SMTP로 메일을 발송합니다. */
        smtpSend(req: SmtpSendRequest): Promise<{ ok: boolean; seq: number }> {
            return this._request("POST", "/v1/smtp/send", req);
        }

        /** SMTP 발송 상태를 조회합니다. */
        smtpStatus(seq: number): Promise<{ ok: boolean; status: string }> {
            return this._request("POST", `/v1/smtp/status/${seq}`, {});
        }
    };
}
