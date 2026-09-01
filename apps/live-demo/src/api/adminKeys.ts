/**
 * 관리자 기능(S14)이 쓰는 쿼리 키와 주기.
 *
 * HTTP 호출부(`api/admin.ts`)와 떨어뜨려 둔 이유는 두 가지다.
 * 1) **온보딩과 관리자 화면이 같은 키를 봐야** 저장 결과가 즉시 반영되는데(완성 기준 2),
 *    양쪽이 문자열을 따로 적으면 언젠가 어긋난다 — 정본을 하나만 둔다.
 * 2) 이 파일은 react-native를 끌고 오지 않아 캐시 동작을 단위 테스트로 검증할 수 있다.
 */

/** 상담 현황 폴링 주기 — 실시간 소켓은 이 용도에 과잉이라 폴링으로 간다(S14) */
export const ADMIN_ROOMS_POLL_MS = 10_000

export const ADMIN_ROOMS_QUERY_KEY = ['admin-rooms'] as const

/** 환자 온보딩(`hooks/useLanguageOptions`)도 이 키로 기관 설정을 읽는다 */
export const ADMIN_SETTINGS_QUERY_KEY = ['admin-settings'] as const
