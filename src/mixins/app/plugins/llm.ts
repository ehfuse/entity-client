import { buildQuery } from "../../../client/utils.js";
import type {
    GConstructor,
    EntityServerClientBase,
} from "../../../client/base.js";

export function LlmMixin<TBase extends GConstructor<EntityServerClientBase>>(
    Base: TBase,
) {
    return class LlmMixinClass extends Base {
        // ── 채팅 ──────────────────────────────────────────────────────────────

        /** LLM 채팅 응답을 반환합니다. */
        llmChat<T = unknown>(body: Record<string, unknown>): Promise<T> {
            return this.http.post("/v1/llm/chat", body);
        }

        /** LLM 채팅 스트림 응답을 반환합니다. */
        llmChatStream<T = unknown>(body: Record<string, unknown>): Promise<T> {
            return this.http.post("/v1/llm/chat/stream", body);
        }

        // ── 대화 세션 ─────────────────────────────────────────────────────────

        /** 대화 세션을 생성합니다. */
        createLlmConversation<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/llm/conversations", body);
        }

        /** 대화 세션에 메시지를 전송합니다. */
        sendLlmMessage<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/llm/conversations/${seq}/messages`,
                body,
            );
        }

        /** 대화 세션 목록을 조회합니다. */
        listLlmConversations<T = unknown>(
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/llm/conversations${qs ? `?${qs}` : ""}`,
            );
        }

        /** 대화 세션 상세를 조회합니다. */
        getLlmConversation<T = unknown>(seq: number): Promise<T> {
            return this.http.get(`/v1/llm/conversations/${seq}`);
        }

        /** 대화 세션을 수정합니다. */
        updateLlmConversation<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.patch(
                `/v1/llm/conversations/${seq}`,
                body,
            );
        }

        /** 대화 세션을 삭제합니다. */
        deleteLlmConversation<T = unknown>(seq: number): Promise<T> {
            return this.http.delete(`/v1/llm/conversations/${seq}`);
        }

        // ── RAG ───────────────────────────────────────────────────────────────

        /** RAG 문서를 업로드합니다. */
        ragUploadDocument<T = unknown>(form: FormData): Promise<T> {
            return this.requestForm("POST", "/v1/llm/rag/documents", form);
        }

        /** RAG 문서 목록을 조회합니다. */
        ragListDocuments<T = unknown>(
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/llm/rag/documents${qs ? `?${qs}` : ""}`,
            );
        }

        /** RAG 문서를 삭제합니다. */
        ragDeleteDocument<T = unknown>(id: string): Promise<T> {
            return this.http.delete(
                `/v1/llm/rag/documents/${encodeURIComponent(id)}`,
            );
        }

        /** RAG 검색을 수행합니다. */
        ragSearch<T = unknown>(body: Record<string, unknown>): Promise<T> {
            return this.http.post("/v1/llm/rag/search", body);
        }

        /** RAG 기반 채팅 응답을 반환합니다. */
        ragChat<T = unknown>(body: Record<string, unknown>): Promise<T> {
            return this.http.post("/v1/llm/rag/chat", body);
        }

        /** RAG 기반 채팅 스트림 응답을 반환합니다. */
        ragChatStream<T = unknown>(body: Record<string, unknown>): Promise<T> {
            return this.http.post("/v1/llm/rag/chat/stream", body);
        }

        /** RAG 인덱스를 재구축합니다. */
        ragRebuildIndex<T = unknown>(
            body?: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/llm/rag/rebuild-index", body);
        }

        // ── 프로바이더 / 사용량 ───────────────────────────────────────────────

        /** LLM 프로바이더 목록을 조회합니다. */
        listLlmProviders<T = unknown>(): Promise<T> {
            return this.http.get("/v1/llm/providers");
        }

        /** LLM 사용량을 조회합니다. */
        getLlmUsage<T = unknown>(
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/llm/usage${qs ? `?${qs}` : ""}`,
            );
        }

        /** LLM 사용량 요약을 조회합니다. */
        getLlmUsageSummary<T = unknown>(
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/llm/usage/summary${qs ? `?${qs}` : ""}`,
            );
        }

        // ── 캐시 ──────────────────────────────────────────────────────────────

        /** LLM 캐시 통계를 조회합니다. */
        getLlmCacheStats<T = unknown>(): Promise<T> {
            return this.http.get("/v1/llm/cache/stats");
        }

        /** LLM 캐시를 초기화합니다. */
        clearLlmCache<T = unknown>(): Promise<T> {
            return this.http.delete("/v1/llm/cache");
        }

        // ── 프롬프트 템플릿 ───────────────────────────────────────────────────

        /** 프롬프트 템플릿 목록을 조회합니다. */
        listLlmTemplates<T = unknown>(): Promise<T> {
            return this.http.get("/v1/llm/templates");
        }

        /** 템플릿 기반 채팅 응답을 반환합니다. */
        llmTemplateChat<T = unknown>(
            name: string,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/llm/${encodeURIComponent(name)}/chat`,
                body,
            );
        }

        /** 템플릿 기반 채팅 스트림 응답을 반환합니다. */
        llmTemplateChatStream<T = unknown>(
            name: string,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/llm/${encodeURIComponent(name)}/chat/stream`,
                body,
            );
        }

        // ── 챗봇 관리 ─────────────────────────────────────────────────────────

        /** 챗봇 목록을 조회합니다. */
        listLlmChatbots<T = unknown>(
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/llm/chatbots${qs ? `?${qs}` : ""}`,
            );
        }

        /** 챗봇을 생성합니다. */
        createLlmChatbot<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/llm/chatbots", body);
        }

        /** 챗봇 상세를 조회합니다. */
        getLlmChatbot<T = unknown>(seq: number): Promise<T> {
            return this.http.get(`/v1/llm/chatbots/${seq}`);
        }

        /** 챗봇을 수정합니다. */
        updateLlmChatbot<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.patch(`/v1/llm/chatbots/${seq}`, body);
        }

        /** 챗봇을 삭제합니다. */
        deleteLlmChatbot<T = unknown>(seq: number): Promise<T> {
            return this.http.delete(`/v1/llm/chatbots/${seq}`);
        }

        // ── 챗봇 채팅 ─────────────────────────────────────────────────────────

        /** 챗봇과 채팅합니다. */
        llmChatbotChat<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/llm/chatbots/${seq}/chat`,
                body,
            );
        }

        /** 챗봇과 채팅 스트림 응답을 반환합니다. */
        llmChatbotChatStream<T = unknown>(
            seq: number,
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post(
                `/v1/llm/chatbots/${seq}/chat/stream`,
                body,
            );
        }

        // ── 챗봇 세션 ─────────────────────────────────────────────────────────

        /** 챗봇 세션 목록을 조회합니다. */
        listLlmChatbotSessions<T = unknown>(
            seq: number,
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/llm/chatbots/${seq}/sessions${qs ? `?${qs}` : ""}`,
            );
        }

        /** 챗봇 세션을 삭제합니다. */
        deleteLlmChatbotSession<T = unknown>(
            seq: number,
            sessionSeq: number,
        ): Promise<T> {
            return this.http.delete(
                `/v1/llm/chatbots/${seq}/sessions/${sessionSeq}`,
            );
        }

        // ── Profile Memory ────────────────────────────────────────────────────

        /** 프로필 메모리 목록을 조회합니다. */
        listLlmProfiles<T = unknown>(
            query: Record<string, unknown> = {},
        ): Promise<T> {
            const qs = buildQuery(query);
            return this.http.get(
                `/v1/llm/profiles${qs ? `?${qs}` : ""}`,
            );
        }

        /** 프로필 메모리를 upsert합니다. */
        upsertLlmProfile<T = unknown>(
            body: Record<string, unknown>,
        ): Promise<T> {
            return this.http.post("/v1/llm/profiles", body);
        }

        /** 프로필 메모리를 삭제합니다. */
        deleteLlmProfile<T = unknown>(seq: number): Promise<T> {
            return this.http.delete(`/v1/llm/profiles/${seq}`);
        }
    };
}
