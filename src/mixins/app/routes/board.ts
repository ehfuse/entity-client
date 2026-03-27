import { buildQuery } from "../../../client/utils.js";
import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function BoardMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class BoardMixinClass extends Base {
        listBoardCategories<T = unknown>(
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/board/categories${qs ? `?${qs}` : ""}`,
                false,
            );
        }

        getBoardCategory<T = unknown>(seq: number): Promise<T> {
            return this.http.get(
                `/v1/board/categories/${seq}`,
                false,
            );
        }

        createBoardCategory<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/board/categories", body);
        }

        updateBoardCategory<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.put(`/v1/board/categories/${seq}`, body);
        }

        deleteBoardCategory<T = unknown>(seq: number): Promise<T> {
            return this.http.delete(`/v1/board/categories/${seq}`);
        }

        listBoardPosts<T = unknown>(
            category: string,
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/board/${category}/list${qs ? `?${qs}` : ""}`,
                false,
            );
        }

        getBoardPost<T = unknown>(seq: number): Promise<T> {
            return this.http.get(
                `/v1/board/posts/${seq}`,
                false,
            );
        }

        createBoardPost<T = unknown>(
            category: string,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/board/${category}/submit`,
                body,
            );
        }

        updateBoardPost<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.put(`/v1/board/posts/${seq}`, body);
        }

        deleteBoardPost<T = unknown>(seq: number): Promise<T> {
            return this.http.delete(`/v1/board/posts/${seq}`);
        }

        listBoardComments<T = unknown>(
            postSeq: number,
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/board/posts/${postSeq}/comments${qs ? `?${qs}` : ""}`,
                false,
            );
        }

        createBoardComment<T = unknown>(
            postSeq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/board/posts/${postSeq}/comments/submit`,
                body,
            );
        }

        updateBoardComment<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.put(`/v1/board/comments/${seq}`, body);
        }

        deleteBoardComment<T = unknown>(seq: number): Promise<T> {
            return this.http.delete(`/v1/board/comments/${seq}`);
        }

        listBoardFiles<T = unknown>(postSeq: number): Promise<T> {
            return this.http.get(
                `/v1/board/posts/${postSeq}/files`,
                false,
            );
        }

        async uploadBoardFile<T = unknown>(
            postSeq: number,
            file: File | Blob,
        ): Promise<T> {
            const form = new FormData();
            form.append(
                "file",
                file,
                file instanceof File ? file.name : "upload",
            );
            return this.requestForm(
                "POST",
                `/v1/board/posts/${postSeq}/files`,
                form,
            );
        }

        boardFileUrl(uuid: string): string {
            return `${this.baseUrl}/v1/board/files/${uuid}`;
        }

        deleteBoardFile<T = unknown>(uuid: string): Promise<T> {
            return this.http.delete(`/v1/board/files/${uuid}`);
        }

        createBoardGuestPost<T = unknown>(
            category: string,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/board/${category}/guest-submit`,
                body,
                false,
            );
        }

        authenticateBoardGuestPost<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/board/posts/${seq}/guest-auth`,
                body,
                false,
            );
        }

        toggleBoardPostLike<T = unknown>(seq: number): Promise<T> {
            return this.http.post(`/v1/board/posts/${seq}/like`, {});
        }

        acceptBoardPost<T = unknown>(seq: number): Promise<T> {
            return this.http.post(
                `/v1/board/posts/${seq}/accept`,
                {},
            );
        }

        rateBoardPost<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/board/posts/${seq}/rating`,
                body,
            );
        }

        rateBoardComment<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/board/comments/${seq}/rating`,
                body,
            );
        }

        listBoardTags<T = unknown>(
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/board/tags${qs ? `?${qs}` : ""}`,
                false,
            );
        }

        setBoardPostTags<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.put(`/v1/board/posts/${seq}/tags`, body);
        }

        reportBoardPost<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/board/posts/${seq}/report`,
                body,
            );
        }

        reportBoardComment<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/board/comments/${seq}/report`,
                body,
            );
        }

        listBoardReports<T = unknown>(
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/board/admin/reports${qs ? `?${qs}` : ""}`,
            );
        }

        updateBoardReport<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.patch(
                `/v1/board/admin/reports/${seq}`,
                body,
            );
        }

        markBoardPostRead<T = unknown>(seq: number): Promise<T> {
            return this.http.post(`/v1/board/posts/${seq}/read`, {});
        }

        listBoardMentions<T = unknown>(
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/board/mentions${qs ? `?${qs}` : ""}`,
            );
        }

        markBoardMentionRead<T = unknown>(seq: number): Promise<T> {
            return this.http.patch(
                `/v1/board/mentions/${seq}/read`,
                {},
            );
        }
    };
}
