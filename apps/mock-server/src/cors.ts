/**
 * CORS 오리진 화이트리스트 (S07).
 *
 * 원칙: **저장소를 클론해서 아무 설정 없이 실행하면 예전처럼 동작해야 한다.**
 * 그래서 `ALLOWED_ORIGINS`가 비어 있으면 기존과 똑같이 `*`를 돌려주고,
 * 값이 있을 때만 목록에 있는 오리진에만 응답한다(배포 환경).
 */

/** 이 값이면 "예전대로 전부 허용" — 명시적으로 적어 넣을 수도 있다 */
const ALLOW_ALL = '*'

export interface CorsPolicy {
  /** `*` 모드인가 (설정 없음 = 로컬 개발) */
  readonly allowAll: boolean
  /** 정규화된 허용 패턴 목록. `allowAll`이면 빈 배열 */
  readonly patterns: readonly string[]
  /**
   * 요청의 `Origin`에 대해 응답할 `Access-Control-Allow-Origin` 값.
   * `null`이면 헤더를 붙이지 않는다(= 브라우저가 차단).
   */
  allowOriginFor: (origin: string | undefined) => string | null
  /** 오리진이 정책상 허용되는가. `Origin` 없는 요청(curl·네이티브 앱)은 허용이다. */
  isAllowed: (origin: string | undefined) => boolean
}

/** 끝의 `/`·공백을 떼고 소문자로 — 대시보드에서 URL을 붙여넣다 흔히 생기는 차이를 흡수한다 */
function normalize(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase()
}

/** 쉼표/공백/줄바꿈 아무거나로 구분해도 받는다 */
export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (raw === undefined) return []
  const seen = new Set<string>()
  for (const part of raw.split(/[,\s]+/)) {
    const value = normalize(part)
    if (value !== '') seen.add(value)
  }
  return [...seen]
}

/**
 * `*`는 점을 넘지 않는 한 조각에만 대응한다 — `https://*.vercel.app`이
 * `https://demo-git-abc.vercel.app`은 받고 `https://a.b.vercel.app`은 받지 않는다.
 */
function toMatcher(pattern: string): (origin: string) => boolean {
  if (!pattern.includes('*')) return (origin) => origin === pattern
  const source = pattern
    .split('*')
    .map((chunk) => chunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^./]+')
  const regex = new RegExp(`^${source}$`)
  return (origin) => regex.test(origin)
}

export function createCorsPolicy(raw: string | undefined): CorsPolicy {
  const patterns = parseAllowedOrigins(raw)
  const allowAll = patterns.length === 0 || patterns.includes(ALLOW_ALL)

  if (allowAll) {
    return {
      allowAll: true,
      patterns: [],
      allowOriginFor: () => ALLOW_ALL,
      isAllowed: () => true,
    }
  }

  const matchers = patterns.map(toMatcher)
  const matches = (origin: string): boolean => matchers.some((match) => match(origin))

  return {
    allowAll: false,
    patterns,
    allowOriginFor: (origin) => {
      // Origin이 없는 요청(curl·서버 간 호출·네이티브 앱)에는 CORS 자체가 적용되지 않는다.
      if (origin === undefined || origin === '') return null
      return matches(normalize(origin)) ? origin : null
    },
    isAllowed: (origin) => {
      if (origin === undefined || origin === '') return true
      return matches(normalize(origin))
    },
  }
}
