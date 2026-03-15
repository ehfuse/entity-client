/**
 * 환경변수를 읽습니다.
 * - 브라우저/Vite: `import.meta.env`
 * - Node.js: `process.env`
 */
export function readEnv(name: string): string | undefined {
    // Vite / 기타 번들러 (import.meta.env)
    const meta = import.meta as unknown as {
        env?: Record<string, string | undefined>;
    };
    if (meta?.env?.[name] != null) return meta.env[name];

    // Node.js (process.env)
    const _proc = (
        globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process;
    if (_proc?.env?.[name] != null) {
        return _proc.env[name];
    }

    return undefined;
}

/** 쿼리 파라미터 객체를 URL 쿼리 문자열로 변환합니다. `orderBy` 키는 `order_by`로 변환됩니다. */
export function buildQuery(params: Record<string, unknown>): string {
    return Object.entries(params)
        .filter(([, value]) => value != null)
        .map(
            ([key, value]) =>
                `${encodeURIComponent(key === "orderBy" ? "order_by" : key)}=${encodeURIComponent(String(value))}`,
        )
        .join("&");
}
