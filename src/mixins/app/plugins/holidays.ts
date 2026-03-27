import { buildQuery } from "../../../client/utils.js";
import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function HolidaysMixin<
    TBase extends GConstructor<EntityServerClientBase>,
>(Base: TBase) {
    return class HolidaysMixinClass extends Base {
        /** 공휴일 목록을 조회합니다. */
        listHolidays<T = unknown>(
            query: {
                year?: number;
                month?: number;
                is_holiday?: "Y" | "N";
            } = {},
        ): Promise<T> {
            const qs = buildQuery(query as Record<string, unknown>);
            return this.http.get(
                `/v1/holidays${qs ? `?${qs}` : ""}`,
                false,
            );
        }

        /** 특정 날짜의 공휴일 정보를 조회합니다. (e.g. "20250101") */
        getHolidayByDate<T = unknown>(locdate: string): Promise<T> {
            return this.http.get(
                `/v1/holidays/${encodeURIComponent(locdate)}`,
                false,
            );
        }

        /** 공휴일 데이터를 동기화합니다. (관리자 전용) */
        syncHolidays<T = unknown>(body?: Record<string, unknown>): Promise<T> {
            return this.http.post("/v1/holidays/sync", body);
        }
    };
}
