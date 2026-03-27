import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function FriendtalkMixin<
    TBase extends GConstructor<EntityServerClientBase>,
>(Base: TBase) {
    return class FriendtalkMixinClass extends Base {
        /** 친구톡을 발송합니다. */
        friendtalkSend<T = unknown>(body: Record<string, unknown>): Promise<T> {
            return this.http.post("/v1/friendtalk/send", body);
        }
    };
}
