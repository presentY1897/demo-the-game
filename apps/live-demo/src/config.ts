import { Platform } from 'react-native'

declare const process: { env: Record<string, string | undefined> }

// Android 에뮬레이터에서 호스트 머신은 10.0.2.2로 접근한다
const fallbackHost = Platform.select({ android: '10.0.2.2', default: 'localhost' })

/**
 * `EXPO_PUBLIC_*`는 **점 접근(`process.env.EXPO_PUBLIC_X`)일 때만** 빌드 시점에
 * 실제 값으로 치환된다. 대괄호 접근(`process.env['EXPO_PUBLIC_X']`)은 치환되지 않고
 * 번들에서 통째로 사라져 `undefined`로 접히므로, 배포 빌드가 **조용히 localhost를
 * 가리킨다**(2026-09-01 S07에서 실제로 발견). 이 두 줄의 형태를 바꾸지 마라.
 */
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL
const configuredAppUrl = process.env.EXPO_PUBLIC_APP_URL

/**
 * 끝의 `/`를 떼어낸다. 호출부가 전부 `${API_BASE}/api/...` 꼴이라 트레일링 슬래시가
 * 남으면 `//api/...`가 되어 404가 난다 — 대시보드에서 URL을 붙여넣다 흔히 생기는 사고다.
 * 빈 문자열(값 없이 등록된 환경변수)은 미설정과 같게 취급한다.
 */
function normalizeOrigin(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim().replace(/\/+$/, '')
  return trimmed === '' ? undefined : trimmed
}

export const API_BASE = normalizeOrigin(configuredApiUrl) ?? `http://${fallbackHost}:4010`

/**
 * `https://` → `wss://`, `http://` → `ws://`.
 * 배포는 https라 WS도 `wss://`여야 브라우저의 혼합 콘텐츠 차단에 걸리지 않는다.
 */
export const WS_BASE = API_BASE.replace(/^http/, 'ws')

/**
 * 공유 링크·QR에 넣을 앱의 절대 주소.
 * 웹에서는 현재 주소창의 origin이 언제나 옳다(로컬·프리뷰·배포 도메인 모두).
 * 네이티브에는 origin이 없으므로 배포 도메인을 `EXPO_PUBLIC_APP_URL`로 주입해야
 * 환자 폰이 열 수 있는 링크가 나온다 — 없으면 Expo 웹 기본 포트로 떨어진다.
 */
function resolveAppOrigin(): string {
  const configured = normalizeOrigin(configuredAppUrl)
  if (configured !== undefined) return configured
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin
  return `http://${fallbackHost}:8081`
}

export const APP_ORIGIN = resolveAppOrigin()
