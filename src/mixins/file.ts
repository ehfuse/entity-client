import type { FileMeta, FileUploadOptions } from "../types";
import type { GConstructor, EntityServerClientBase } from "../client/base";

export function FileMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class FileMixinClass extends Base {
        // ─── 파일 관리 ────────────────────────────────────────────────────────

        /**
         * 파일을 업로드합니다. (multipart/form-data)
         *
         * ```ts
         * const input = document.querySelector('input[type="file"]');
         * const result = await client.fileUpload("product", input.files[0]);
         * console.log(result.data.uuid);
         * ```
         */
        async fileUpload(
            entity: string,
            file: File | Blob,
            opts: FileUploadOptions = {},
        ): Promise<{ ok: boolean; uuid: string; data: FileMeta }> {
            const form = new FormData();
            form.append(
                "file",
                file,
                file instanceof File ? file.name : "upload",
            );
            if (opts.refSeq != null)
                form.append("ref_seq", String(opts.refSeq));
            if (opts.isPublic != null)
                form.append("is_public", opts.isPublic ? "true" : "false");
            return this._requestForm(
                "POST",
                `/v1/files/${entity}/upload`,
                form,
            );
        }

        /** 파일을 다운로드합니다. `ArrayBuffer`를 반환합니다. */
        fileDownload(entity: string, uuid: string): Promise<ArrayBuffer> {
            return this._requestBinary(
                "POST",
                `/v1/files/${entity}/download/${uuid}`,
                {},
            );
        }

        /** 파일을 삭제합니다. */
        fileDelete(
            entity: string,
            uuid: string,
        ): Promise<{ ok: boolean; uuid: string; deleted: boolean }> {
            return this._request(
                "POST",
                `/v1/files/${entity}/delete/${uuid}`,
                {},
            );
        }

        /** 엔티티에 연결된 파일 목록을 조회합니다. */
        fileList(
            entity: string,
            opts: { refSeq?: number } = {},
        ): Promise<{
            ok: boolean;
            data: { items: FileMeta[]; total: number };
        }> {
            return this._request(
                "POST",
                `/v1/files/${entity}/list`,
                opts.refSeq ? { ref_seq: opts.refSeq } : {},
            );
        }

        /** 파일 메타 정보를 조회합니다. */
        fileMeta(
            entity: string,
            uuid: string,
        ): Promise<{ ok: boolean; data: FileMeta }> {
            return this._request(
                "POST",
                `/v1/files/${entity}/meta/${uuid}`,
                {},
            );
        }

        /** 임시 파일 접근 토큰을 발급합니다. */
        fileToken(uuid: string): Promise<{ ok: boolean; token: string }> {
            return this._request("POST", `/v1/files/token/${uuid}`, {});
        }

        /** 파일 인라인 뷰 URL을 반환합니다. (fetch 없음, URL 조합만) */
        fileUrl(uuid: string): string {
            return `${this.baseUrl}/v1/files/${uuid}`;
        }
    };
}
