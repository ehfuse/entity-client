import { EntityServerApi, entityServer } from "../index.js";
import {
    useEntityClient,
    type UseEntityClientResult,
    type UseEntityServerOptions,
} from "./useEntityClient.js";

export type { UseEntityServerOptions };

export interface UseEntityServerResult extends UseEntityClientResult<EntityServerApi> {}

/**
 * React 환경에서 EntityServerApi 인스턴스와 mutation 상태를 반환합니다.
 *
 * - `singleton=true`(기본): 패키지 전역 `entityServer` 인스턴스를 사용합니다.
 * - `singleton=false`: 컴포넌트 스코프의 새 인스턴스를 생성합니다.
 *
 * @example
 * ```tsx
 * const { submit, del, isPending, error, reset } = useEntityServer();
 *
 * const handleSave = async () => {
 *     await submit("account", { name: "홍길동" });
 * };
 * ```
 */
export function useEntityServer(
    options: UseEntityServerOptions = {},
): UseEntityServerResult {
    return useEntityClient(options, {
        singletonInstance: entityServer,
        ClientClass: EntityServerApi,
    });
}
