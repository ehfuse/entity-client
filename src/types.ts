// ─── 목록 조회 ───────────────────────────────────────────────────────────────

/**
 * 엔티티 목록 조회 파라미터입니다.
 *
 * ```ts
 * client.list("post", {
 *   page: 1, limit: 10,
 *   orderBy: "created_time", orderDir: "DESC",
 *   fields: ["seq", "title", "created_time"],
 *   conditions: { status: "active" },
 * });
 * ```
 */
export interface EntityListParams {
    /** 조회 페이지 번호. 기본값: `1` */
    page?: number;
    /** 페이지당 레코드 수. 기본값: `20` */
    limit?: number;
    /** 정렬 기준 필드명 */
    orderBy?: string;
    /** 정렬 방향. 기본값: `"ASC"` */
    orderDir?: "ASC" | "DESC";
    /**
     * 반환할 필드 목록.
     *
     * - **미지정 (기본값)**: 엔티티의 인덱스 필드만 반환합니다.
     *   복호화를 건너뛰기 때문에 **가장 빠릅니다**.
     * - `["*"]`: 전체 필드 반환 (복호화 수행).
     * - 필드명 목록: 해당 필드만 반환합니다.
     *   엔티티 설정에 `index`로 선언된 필드만 지정 가능합니다.
     *   존재하지 않는 필드명을 지정하면 서버 에러가 발생합니다.
     * - `seq`, `created_time`, `updated_time`, `license_seq`는 필드에 관계없이 항상 포함됩니다.
     *
     * ```ts
     * // 기본값 (인덱스 필드만, 가장 빠름)
     * client.list("account")
     * // 전체 필드
     * client.list("account", { fields: ["*"] })
     * // seq, name, email만
     * client.list("account", { fields: ["seq", "name", "email"] })
     * ```
     */
    fields?: string[];
    /** 필터 조건. POST body로 전달됩니다. (예: `{ status: "active" }`) */
    conditions?: Record<string, unknown>;
}

/**
 * `list()`, `history()` 응답의 `data` 필드 구조입니다.
 *
 * 서버는 항상 이 구조로 반환합니다:
 * ```json
 * { "ok": true, "data": { "items": [...], "total": 100, "page": 1, "limit": 20 } }
 * ```
 */
export interface EntityListResult<T = unknown> {
    items: T[];
    /** 전체 레코드 수 */
    total: number;
    /** 현재 페이지 번호 */
    page: number;
    /** 페이지당 레코드 수 */
    limit: number;
}

// ─── 쿼리 ────────────────────────────────────────────────────────────────────

/**
 * `query()` 메서드에 전달하는 SQL 쿼리 요청입니다.
 *
 * - `sql`: SELECT 전용 SQL. 인덱스 테이블만 조회 가능하며 JOIN 지원.
 * - `params`: SQL 바인딩 파라미터 (`?` 플레이스홀더 대응).
 * - `limit`: 최대 반환 건수 (최대 1000. 미지정 시 서버 기본값 적용).
 *
 * ```ts
 * client.query("order", {
 *   sql: `SELECT o.seq, o.status, u.name
 *         FROM order o
 *         JOIN account u ON u.data_seq = o.account_seq
 *         WHERE o.status = ?`,
 *   params: ["pending"],
 *   limit: 100,
 * });
 * ```
 */
export interface EntityQueryRequest {
    sql: string;
    params?: unknown[];
    limit?: number;
}

// ─── 이력 ────────────────────────────────────────────────────────────────────

/**
 * `history()` 응답의 개별 이력 레코드 구조입니다.
 *
 * - `action`: `"INSERT"` | `"UPDATE"` | `"DELETE_SOFT"` | `"DELETE_HARD"` | `"ROLLBACK"`
 * - `data_snapshot`: 변경 당시 엔티티 데이터 스냅샷
 */
export interface EntityHistoryRecord<T = unknown> {
    seq: number;
    action:
        | "INSERT"
        | "UPDATE"
        | "DELETE_SOFT"
        | "DELETE_HARD"
        | "ROLLBACK"
        | string;
    data_snapshot: T | null;
    changed_by: number | null;
    changed_time: string;
}

// ─── 푸시 ────────────────────────────────────────────────────────────────────

export interface RegisterPushDeviceOptions {
    platform?: string;
    deviceType?: string;
    browser?: string;
    browserVersion?: string;
    pushEnabled?: boolean;
    transactionId?: string;
}

export interface EntityServerClientHealthCsrf {
    enabled: boolean;
    token?: string;
    headerName?: string;
    refreshPath?: string;
    expiresIn?: number;
}

// ─── 클라이언트 옵션 ──────────────────────────────────────────────────────────

/** EntityServerClient 생성/설정 옵션입니다. */
export interface EntityServerClientOptions {
    baseUrl?: string;
    token?: string;
    /**
     * 익명 패킷 암호화용 부트스트랩 토큰입니다.
     * entity-app-server의 `/v1/health` 응답으로 설정되는 용도입니다.
     */
    anonymousPacketToken?: string;
    csrfEnabled?: boolean;
    csrfToken?: string;
    csrfHeaderName?: string;
    csrfRefreshPath?: string;
    csrfRefreshBuffer?: number;
    /**
     * `true`이면 인증된 POST/PUT 요청 바디를 XChaCha20-Poly1305로 암호화합니다.
     *
     * 서버의 `EnablePacketEncryption`이 활성화된 경우 필수로 설정해야 합니다.
     * 로그인(`login()`)·토큰 갱신(`refreshToken()`)은 인증 전 요청이므로 자동으로 건너뜁니다.
     *
     * 기본값: `false`
     */
    encryptRequests?: boolean;
    /**
     * `true`이면 `login()` 성공 후 Access Token 만료 전에 자동으로 갱신(silent refresh)합니다.
     * 갱신 시점은 `expires_in - refreshBuffer` 초입니다.
     *
     * 갱신 성공 시 `onTokenRefreshed`, 실패 시 `onSessionExpired` 콜백이 호출됩니다.
     *
     * 기본값: `false`
     */
    keepSession?: boolean;
    /**
     * 만료 몇 초 전에 자동 갱신을 시도할지 설정합니다.
     *
     * 예: `expires_in = 3600`, `refreshBuffer = 60` → 3540초 후 갱신
     *
     * 기본값: `60`
     */
    refreshBuffer?: number;
    /**
     * 자동 갱신 성공 시 호출되는 콜백입니다.
     * 새 `access_token`과 `expires_in`이 전달됩니다.
     * 앱은 이 콜백에서 localStorage 등에 토큰을 저장해야 합니다.
     */
    onTokenRefreshed?: (accessToken: string, expiresIn: number) => void;
    /**
     * 세션 유지 갱신 실패 시 호출되는 콜백입니다.
     * refresh_token 만료 등으로 재발급이 불가능한 경우입니다.
     * 앱은 이 콜백에서 로그인 페이지로 이동하는 등의 처리를 해야 합니다.
     */
    onSessionExpired?: (error: Error) => void;
    /**
     * HMAC 인증용 API Key (`X-API-Key` 헤더).
     * `hmacSecret`과 함께 설정하면 HMAC 인증 모드로 동작합니다.
     * **서버 사이드(Node.js 등) 전용. 브라우저에서는 사용하지 마세요.**
     */
    apiKey?: string;
    /**
     * HMAC 인증 시크릿. `apiKey`와 함께 설정하면 HMAC 인증 모드로 동작합니다.
     *
     * 패킷 암호화 키도 이 값에서 HKDF-SHA256으로 유도합니다:
     * `key = HKDF-SHA256(hmac_secret, info="entity-server:packet-encryption", salt="entity-server:hkdf:v1")`
     *
     * **서버 사이드(Node.js 등) 전용. 브라우저에서는 사용하지 마세요.**
     */
    hmacSecret?: string;
}

// ─── SMTP ─────────────────────────────────────────────────────────────────────

/** `smtpSend()` 요청 파라미터입니다. */
export interface SmtpSendRequest {
    /** provider 식별자 (생략 시 기본 provider 사용) */
    provider?: string;
    from?: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body_text?: string;
    body_html?: string;
    /** 이메일 템플릿 이름 */
    template_name?: string;
    /** 템플릿 변수 */
    template_data?: Record<string, unknown>;
    /** 첨부 파일 seq 배열 */
    attachments?: number[];
    reply_to?: string;
    ref_entity?: string;
    ref_seq?: number;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

/** `qrcode()` / `qrcodeBase64()` / `qrcodeText()` 공통 옵션 */
export interface QRCodeOptions {
    /** PNG 크기 픽셀 (기본 256, 최대 2048) */
    size?: number;
    /** 오류 복구 수준 (기본 `"medium"`) */
    error_correction?: "low" | "medium" | "high" | "highest";
    /** 전경색 hex (기본 `"#000000"`) */
    fg_color?: string;
    /** 배경색 hex (기본 `"#ffffff"`) */
    bg_color?: string;
}

/** `barcode()` 옵션 */
export interface BarcodeOptions {
    /** 바코드 타입 (기본 `"code128"`) */
    type?:
        | "code128"
        | "code39"
        | "ean13"
        | "ean8"
        | "codabar"
        | "datamatrix"
        | "itf";
    /** 너비 픽셀 (기본 300, 최대 2048) */
    width?: number;
    /** 높이 픽셀 (기본 100, 최대 2048) */
    height?: number;
}

/** `pdf2png()` 옵션 */
export interface Pdf2PngOptions {
    /** 해상도 DPI (기본 300) */
    dpi?: number;
    /** 시작 페이지 1-based (기본: 첫 번째 페이지) */
    firstPage?: number;
    /** 종료 페이지 1-based (기본: 마지막 페이지) */
    lastPage?: number;
}

// ─── 파일 ─────────────────────────────────────────────────────────────────────

/** 파일 메타 정보 */
export interface FileMeta {
    uuid: string;
    original_name: string;
    size: number;
    mime_type: string;
    entity: string;
    ref_seq?: number;
    is_public?: boolean;
    created_time: string;
    url?: string;
}

/** `fileUpload()` 옵션 */
export interface FileUploadOptions {
    /** 파일에 연결할 ref_seq */
    refSeq?: number;
    /** 공개 파일 여부 (기본 서버 설정 따름) */
    isPublic?: boolean;
}
