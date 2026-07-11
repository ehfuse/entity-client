/**
 * JWT 페이로드 디코드 유틸 (서명 검증 없음 — 세션 정체성 비교 전용).
 *
 * 같은 도메인에서 여러 라이선스/계정으로 번갈아 로그인하면 HttpOnly refresh 쿠키가
 * 탭 간에 공유되어, 쿠키 기반 토큰 갱신이 "다른 계정"의 access token 을 돌려줄 수 있다.
 * 갱신 토큰을 채택하기 전에 기존 토큰과 계정(sub)·라이선스(license_seq)가 같은지
 * 반드시 비교해 교차 계정 세션 오염을 차단한다.
 */

/** base64url 문자열을 UTF-8 문자열로 디코드한다. */
function decodeBase64Url(value: string): string {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    if (typeof atob === "function") {
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    }

    return Buffer.from(padded, "base64").toString("utf-8");
}

/** JWT 페이로드를 서명 검증 없이 디코드한다. 형식이 아니면 null. */
export function decodeJwtPayload(
    token: string | null | undefined,
): Record<string, unknown> | null {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    try {
        const payload = JSON.parse(decodeBase64Url(parts[1])) as unknown;
        return payload && typeof payload === "object"
            ? (payload as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}

/**
 * 두 토큰이 같은 계정(sub)·같은 라이선스(license_seq) 소유인지 판별한다.
 * 어느 한쪽이라도 판별 불가(디코드 실패, sub 없음)면 false — 안전 쪽으로 기운다.
 */
export function sameJwtIdentity(
    tokenA: string | null | undefined,
    tokenB: string | null | undefined,
): boolean {
    const payloadA = decodeJwtPayload(tokenA);
    const payloadB = decodeJwtPayload(tokenB);
    const subA = String(payloadA?.sub ?? "").trim();
    const subB = String(payloadB?.sub ?? "").trim();
    if (!subA || !subB || subA !== subB) {
        return false;
    }

    const licenseA = payloadA?.license_seq;
    const licenseB = payloadB?.license_seq;
    if (
        licenseA !== undefined &&
        licenseA !== null &&
        licenseB !== undefined &&
        licenseB !== null &&
        String(licenseA) !== String(licenseB)
    ) {
        return false;
    }

    return true;
}
