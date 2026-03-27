import type {
    QRCodeOptions,
    BarcodeOptions,
    Pdf2PngOptions,
} from "../types.js";
import type { GConstructor, EntityServerClientBase } from "../client/base.js";

export function UtilsMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class UtilsMixinClass extends Base {
        // ─── Utils (QR / 바코드) ──────────────────────────────────────────────

        /**
         * QR 코드 PNG를 생성합니다. `ArrayBuffer`를 반환합니다.
         *
         * ```ts
         * const buf = await client.qrcode("https://example.com");
         * const blob = new Blob([buf], { type: "image/png" });
         * img.src = URL.createObjectURL(blob);
         * ```
         */
        qrcode(
            content: string,
            opts: QRCodeOptions = {},
        ): Promise<ArrayBuffer> {
            return this._requestBinary("POST", "/v1/utils/qrcode", {
                content,
                ...opts,
            });
        }

        /**
         * QR 코드를 base64/data URI JSON으로 반환합니다.
         *
         * ```ts
         * const { data_uri } = await client.qrcodeBase64("https://example.com");
         * img.src = data_uri;
         * ```
         */
        qrcodeBase64(
            content: string,
            opts: QRCodeOptions = {},
        ): Promise<{ ok: boolean; data: string; data_uri: string }> {
            return this._request("POST", "/v1/utils/qrcode/base64", {
                content,
                ...opts,
            });
        }

        /** QR 코드를 ASCII 아트 텍스트로 반환합니다. */
        qrcodeText(
            content: string,
            opts: QRCodeOptions = {},
        ): Promise<{ ok: boolean; text: string }> {
            return this._request("POST", "/v1/utils/qrcode/text", {
                content,
                ...opts,
            });
        }

        /**
         * 바코드 PNG를 생성합니다. `ArrayBuffer`를 반환합니다.
         *
         * ```ts
         * const buf = await client.barcode("1234567890128", { type: "ean13" });
         * ```
         */
        barcode(
            content: string,
            opts: BarcodeOptions = {},
        ): Promise<ArrayBuffer> {
            return this._requestBinary("POST", "/v1/utils/barcode", {
                content,
                ...opts,
            });
        }

        /**
         * PDF를 PNG 이미지로 변환합니다.
         *
         * 단일 페이지 요청이면 `image/png` ArrayBuffer,
         * 다중 페이지 요청이면 `application/zip` ArrayBuffer를 반환합니다.
         *
         * ```ts
         * const buf = await client.pdf2png(pdfArrayBuffer, { dpi: 200 });
         * ```
         */
        pdf2png(
            pdfData: ArrayBuffer | Uint8Array<ArrayBuffer>,
            opts: Pdf2PngOptions = {},
        ): Promise<ArrayBuffer> {
            const form = new FormData();
            form.append(
                "file",
                new Blob([pdfData], { type: "application/pdf" }),
                "document.pdf",
            );
            const params = new URLSearchParams();
            if (opts.dpi != null) params.set("dpi", String(opts.dpi));
            if (opts.firstPage != null)
                params.set("first_page", String(opts.firstPage));
            if (opts.lastPage != null)
                params.set("last_page", String(opts.lastPage));
            const qs = params.toString();
            const path = "/v1/utils/pdf2png" + (qs ? `?${qs}` : "");
            return this._requestFormBinary("POST", path, form);
        }
    };
}
