import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function IdentityMixin<
    TBase extends GConstructor<EntityServerClientBase>,
>(Base: TBase) {
    return class IdentityMixinClass extends Base {
        /** 본인인증 요청을 생성합니다. */
        identityRequest<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/identity/request",
                body,
                false,
            );
        }

        /** 본인인증 중계사 콜백을 수신합니다. */
        identityCallback<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                "/v1/identity/callback",
                body,
                false,
            );
        }

        /** 본인인증 결과를 조회합니다. */
        identityResult<T = unknown>(requestId: string): Promise<T> {
            return this.http.get(
                `/v1/identity/result/${encodeURIComponent(requestId)}`,
                false,
            );
        }

        /** CI 중복 여부를 확인합니다. (JWT 필요) */
        identityVerifyCI<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/identity/verify-ci", body);
        }
    };
}
