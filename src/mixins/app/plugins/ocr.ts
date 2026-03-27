import { buildQuery } from "../../../client/utils.js";
import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function OcrMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class OcrMixinClass extends Base {
        /** OCR 인식을 수행합니다. */
        ocrRecognize<T = unknown>(form: FormData): Promise<T> {
            return this.requestForm("POST", "/v1/ocr/recognize", form);
        }

        /** OCR 인식을 비동기로 요청합니다. */
        ocrRecognizeAsync<T = unknown>(form: FormData): Promise<T> {
            return this.requestForm("POST", "/v1/ocr/recognize/async", form);
        }

        /** 문서 유형별 OCR 인식을 수행합니다. */
        ocrRecognizeByDocType<T = unknown>(
            docType: string,
            form: FormData,
        ): Promise<T> {
            return this.requestForm(
                "POST",
                `/v1/ocr/${encodeURIComponent(docType)}`,
                form,
            );
        }

        /** OCR 결과 목록을 조회합니다. */
        listOcrResults<T = unknown>(
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/ocr/results${qs ? `?${qs}` : ""}`,
            );
        }

        /** OCR 결과 상세를 조회합니다. */
        getOcrResult<T = unknown>(id: string): Promise<T> {
            return this.http.get(
                `/v1/ocr/results/${encodeURIComponent(id)}`,
            );
        }

        /** OCR 결과 텍스트를 조회합니다. */
        getOcrResultText<T = unknown>(id: string): Promise<T> {
            return this.http.get(
                `/v1/ocr/results/${encodeURIComponent(id)}/text`,
            );
        }

        /** OCR 결과를 삭제합니다. */
        deleteOcrResult<T = unknown>(id: string): Promise<T> {
            return this.http.delete(
                `/v1/ocr/results/${encodeURIComponent(id)}`,
            );
        }

        /** OCR 사용 할당량을 조회합니다. */
        getOcrQuota<T = unknown>(): Promise<T> {
            return this.http.get("/v1/ocr/quota");
        }
    };
}
