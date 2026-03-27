import { EntityAppServerApi, entityAppServer } from "../index.js";
import {
    useEntityClient,
    type UseEntityClientResult,
    type UseEntityServerOptions,
} from "./useEntityClient.js";

export interface UseEntityAppServerOptions extends UseEntityServerOptions {}

export interface UseEntityAppServerResult extends UseEntityClientResult<EntityAppServerApi> {}

/**
 * React 환경에서 EntityAppServerApi 인스턴스와 mutation 상태를 반환합니다.
 *
 * - `singleton=true`(기본): 패키지 전역 `entityAppServer` 인스턴스를 사용합니다.
 * - `singleton=false`: 컴포넌트 스코프의 새 인스턴스를 생성합니다.
 *
 * @example
 * ```tsx
 * const { submit, del, isPending, error } = useEntityAppServer();
 * ```
 */
export function useEntityAppServer(
    options: UseEntityAppServerOptions = {},
): UseEntityAppServerResult {
    return useEntityClient(options, {
        singletonInstance: entityAppServer,
        ClientClass: EntityAppServerApi,
    });
}
