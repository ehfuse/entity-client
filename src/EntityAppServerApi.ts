import { EntityServerApi } from "./EntityServerApi.js";
import {
    AccountAppMixin,
    BoardMixin,
    EmailVerifyMixin,
    OAuthMixin,
    PasswordResetMixin,
    TwoFactorMixin,
} from "./mixins/app/index.js";
import {
    AlimtalkMixin,
    AppPushMixin,
    FriendtalkMixin,
    HolidaysMixin,
    IdentityMixin,
    LlmMixin,
    OcrMixin,
    PgMixin,
    SmsMixin,
    TaxinvoiceMixin,
} from "./mixins/app/plugins/index.js";

export class EntityAppServerApi extends AlimtalkMixin(
    FriendtalkMixin(
        SmsMixin(
            AppPushMixin(
                PgMixin(
                    TaxinvoiceMixin(
                        OcrMixin(
                            LlmMixin(
                                IdentityMixin(
                                    HolidaysMixin(
                                        OAuthMixin(
                                            TwoFactorMixin(
                                                PasswordResetMixin(
                                                    EmailVerifyMixin(
                                                        BoardMixin(
                                                            AccountAppMixin(
                                                                EntityServerApi,
                                                            ),
                                                        ),
                                                    ),
                                                ),
                                            ),
                                        ),
                                    ),
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        ),
    ),
) {}
