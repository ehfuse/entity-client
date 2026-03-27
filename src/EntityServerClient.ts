/**
 * @file EntityServerClient.ts
 * Mixin 패턴으로 구성된 EntityServerClient.
 *
 * 절(section)별 구현:
 *   src/client/base.ts      — 상태·생성자·공통 헬퍼
 *   src/mixins/auth.ts      — 인증 (로그인/로그아웃/me/트랜잭션 등)
 *   src/mixins/entity.ts    — 트랜잭션 & 엔티티 CRUD
 *   src/mixins/push.ts      — 푸시 디바이스 관리
 *   src/mixins/smtp.ts      — SMTP 메일 발송
 *   src/mixins/file.ts      — 파일 스토리지
 *   src/mixins/utils.ts     — QR코드/바코드/PDF변환
 */
import { EntityServerClientBase } from "./client/base.js";
import { AuthMixin } from "./mixins/auth.js";
import { EntityMixin } from "./mixins/entity.js";
import { PushMixin } from "./mixins/push.js";
import { SmtpMixin } from "./mixins/smtp.js";
import { FileMixin } from "./mixins/file.js";
import { UtilsMixin } from "./mixins/utils.js";

// ─── Composed class ───────────────────────────────────────────────────────────

export class EntityServerClient extends UtilsMixin(
    FileMixin(
        SmtpMixin(PushMixin(EntityMixin(AuthMixin(EntityServerClientBase)))),
    ),
) {}
