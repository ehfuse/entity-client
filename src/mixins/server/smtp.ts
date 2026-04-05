import type { SmtpSendRequest } from "../../types.js";
import type {
    GConstructor,
    EntityServerClientBase,
} from "../../client/base.js";

export function SmtpMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class SmtpMixinClass extends Base {
        // ─── SMTP 메일 발송 ───────────────────────────────────────────────────

        /** SMTP로 메일을 발송합니다. */
        smtpSend(req: SmtpSendRequest): Promise<{ ok: boolean; seq: number }> {
            return this.request("POST", "/v1/smtp/send", req);
        }

        /** SMTP 발송 상태를 조회합니다. */
        smtpStatus(seq: number): Promise<{ ok: boolean; status: string }> {
            return this.request("POST", `/v1/smtp/status/${seq}`, {});
        }

        /** SMTP 템플릿 미리보기 HTML을 반환합니다. */
        smtpTemplatePreview(templatePath: string): Promise<string> {
            const encoded = templatePath
                .split("/")
                .map(encodeURIComponent)
                .join("/");
            return fetch(`${this.baseUrl}/v1/smtp/template/${encoded}`, {
                credentials: "include",
            }).then((r) => r.text());
        }
    };
}
