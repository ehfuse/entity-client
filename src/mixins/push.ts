import type {
    EntityListParams,
    EntityListResult,
    RegisterPushDeviceOptions,
} from "../types.js";
import type { GConstructor, EntityServerClientBase } from "../client/base.js";

// entity submit을 가진 base 타입 (EntityMixin 적용 후)
type WithSubmit = EntityServerClientBase & {
    submit(
        entity: string,
        data: Record<string, unknown>,
        opts?: { transactionId?: string; skipHooks?: boolean },
    ): Promise<{ ok: boolean; seq: number }>;
    list<T = unknown>(
        entity: string,
        params?: EntityListParams,
    ): Promise<{ ok: boolean; data: EntityListResult<T> }>;
};

export function PushMixin<TBase extends GConstructor<WithSubmit>>(Base: TBase) {
    return class PushMixinClass extends Base {
        // ─── 푸시 submit 래퍼 ────────────────────────────────────────────────

        /**
         * 푸시 관련 엔티티로 payload를 전송(Submit)합니다.
         * 내부적으로 `submit()` 메서드를 호출합니다.
         */
        push(
            pushEntity: string,
            payload: Record<string, unknown>,
            opts: { transactionId?: string } = {},
        ): Promise<{ ok: boolean; seq: number }> {
            return this.submit(pushEntity, payload, opts);
        }

        // ─── 푸시 디바이스 관리 ───────────────────────────────────────────────

        /** 푸시 로그 엔티티 목록을 조회합니다. */
        pushLogList<T = unknown>(
            params: EntityListParams = {},
        ): Promise<{ ok: boolean; data: EntityListResult<T> }> {
            return this.list<T>("push_log", params);
        }

        /** 계정의 푸시 디바이스를 등록합니다. */
        registerPushDevice(
            accountSeq: number,
            deviceId: string,
            pushToken: string,
            opts: RegisterPushDeviceOptions = {},
        ): Promise<{ ok: boolean; seq: number }> {
            const {
                platform,
                deviceType,
                browser,
                browserVersion,
                pushEnabled = true,
                transactionId,
            } = opts;
            return this.submit(
                "account_device",
                {
                    id: deviceId,
                    account_seq: accountSeq,
                    push_token: pushToken,
                    push_enabled: pushEnabled,
                    ...(platform ? { platform } : {}),
                    ...(deviceType ? { device_type: deviceType } : {}),
                    ...(browser ? { browser } : {}),
                    ...(browserVersion
                        ? { browser_version: browserVersion }
                        : {}),
                },
                { transactionId },
            );
        }

        /** 디바이스 레코드의 푸시 토큰을 갱신합니다. */
        updatePushDeviceToken(
            deviceSeq: number,
            pushToken: string,
            opts: { pushEnabled?: boolean; transactionId?: string } = {},
        ): Promise<{ ok: boolean; seq: number }> {
            const { pushEnabled = true, transactionId } = opts;
            return this.submit(
                "account_device",
                {
                    seq: deviceSeq,
                    push_token: pushToken,
                    push_enabled: pushEnabled,
                },
                { transactionId },
            );
        }

        /** 디바이스의 푸시 수신을 비활성화합니다. */
        disablePushDevice(
            deviceSeq: number,
            opts: { transactionId?: string } = {},
        ): Promise<{ ok: boolean; seq: number }> {
            return this.submit(
                "account_device",
                { seq: deviceSeq, push_enabled: false },
                { transactionId: opts.transactionId },
            );
        }
    };
}
