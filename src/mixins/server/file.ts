import type {
    FileMeta,
    FileUploadOptions,
    StorageMeta,
    StorageUploadOptions,
} from "../../types.js";
import type { GConstructor, EntityServerClientBase } from "../../client/base.js";

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
            return this.requestForm(
                "POST",
                `/v1/files/${entity}/upload`,
                form,
            );
        }

        /** 파일을 다운로드합니다. `ArrayBuffer`를 반환합니다. */
        fileDownload(entity: string, uuid: string): Promise<ArrayBuffer> {
            return this.requestBinary(
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
            return this.request(
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
            return this.request(
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
            return this.request(
                "POST",
                `/v1/files/${entity}/meta/${uuid}`,
                {},
            );
        }

        /** 임시 파일 접근 토큰을 발급합니다. */
        fileToken(uuid: string): Promise<{ ok: boolean; token: string }> {
            return this.request("POST", `/v1/files/token/${uuid}`, {});
        }

        /** 파일 인라인 뷰/다운로드 URL을 반환합니다. */
        fileViewUrl(uuid: string, opts: { download?: boolean } = {}): string {
            const qs = opts.download ? "?download=true" : "";
            return `${this.baseUrl}/v1/files/${uuid}${qs}`;
        }

        /** 파일 인라인 뷰 URL을 반환합니다. (fetch 없음, URL 조합만) */
        fileUrl(uuid: string): string {
            return `${this.baseUrl}/v1/files/${uuid}`;
        }

        // ─── 스토리지 라우트 별칭 ───────────────────────────────────────────

        /** ES 스토리지 업로드 라우트를 파일 API 이름 대신 호출합니다. */
        storageUpload(
            entity: string,
            file: File | Blob,
            opts: StorageUploadOptions = {},
        ): Promise<{ ok: boolean; uuid: string; data: StorageMeta }> {
            return this.fileUpload(entity, file, opts);
        }

        /** ES 스토리지 다운로드 라우트를 파일 API 이름 대신 호출합니다. */
        storageDownload(entity: string, uuid: string): Promise<ArrayBuffer> {
            return this.fileDownload(entity, uuid);
        }

        /** ES 스토리지 삭제 라우트를 파일 API 이름 대신 호출합니다. */
        storageDelete(
            entity: string,
            uuid: string,
        ): Promise<{ ok: boolean; uuid: string; deleted: boolean }> {
            return this.fileDelete(entity, uuid);
        }

        /** ES 스토리지 목록 라우트를 파일 API 이름 대신 호출합니다. */
        storageList(
            entity: string,
            opts: { refSeq?: number } = {},
        ): Promise<{
            ok: boolean;
            data: { items: StorageMeta[]; total: number };
        }> {
            return this.fileList(entity, opts);
        }

        /** ES 스토리지 메타 라우트를 파일 API 이름 대신 호출합니다. */
        storageMeta(
            entity: string,
            uuid: string,
        ): Promise<{ ok: boolean; data: StorageMeta }> {
            return this.fileMeta(entity, uuid);
        }

        /** ES 스토리지 임시 토큰 라우트를 파일 API 이름 대신 호출합니다. */
        storageToken(uuid: string): Promise<{ ok: boolean; token: string }> {
            return this.fileToken(uuid);
        }

        /** ES 스토리지 인라인 뷰/다운로드 URL을 반환합니다. */
        storageViewUrl(uuid: string, opts: { download?: boolean } = {}): string {
            return this.fileViewUrl(uuid, opts);
        }

        /** ES 스토리지 다운로드 URL을 반환합니다. */
        storageDownloadUrl(uuid: string): string {
            return this.fileViewUrl(uuid, { download: true });
        }

        /** ES 스토리지 인라인 뷰 URL을 반환합니다. */
        storageUrl(uuid: string): string {
            return this.fileUrl(uuid);
        }
    };
}
