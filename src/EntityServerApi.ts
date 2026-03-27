/**
 * @file EntityServerApi.ts
 * entity-server core route용 Mixin 조합 클라이언트.
 *
 * 절(section)별 구현:
 *   src/client/base.ts            — 상태·생성자·공통 헬퍼
 *   src/mixins/server/*           — entity-server core route mixin
 *   src/mixins/app/*              — entity-app-server plugin mixin
 */
import { EntityServerClientBase } from "./client/base.js";
import {
    AdminMixin,
    AuthMixin,
    EntityMixin,
    FileMixin,
    PushMixin,
    SmtpMixin,
    TransactionMixin,
    UtilsMixin,
} from "./mixins/server/index.js";

// ─── Composed class ───────────────────────────────────────────────────────────

export class EntityServerApi extends UtilsMixin(
    TransactionMixin(
        FileMixin(
            SmtpMixin(
                PushMixin(
                    AdminMixin(EntityMixin(AuthMixin(EntityServerClientBase))),
                ),
            ),
        ),
    ),
) {}
