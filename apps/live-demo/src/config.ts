import { Platform } from 'react-native'

declare const process: { env: Record<string, string | undefined> }

// Android 에뮬레이터에서 호스트 머신은 10.0.2.2로 접근한다
const fallbackHost = Platform.select({ android: '10.0.2.2', default: 'localhost' })

export const API_BASE = process.env['EXPO_PUBLIC_API_URL'] ?? `http://${fallbackHost}:4010`
export const WS_BASE = API_BASE.replace(/^http/, 'ws')

/**
 * 공유 링크·QR에 넣을 앱의 절대 주소.
 * 웹에서는 현재 주소창의 origin이 언제나 옳다(로컬·프리뷰·배포 도메인 모두).
 * 네이티브에는 origin이 없으므로 배포 도메인을 `EXPO_PUBLIC_APP_URL`로 주입해야
 * 환자 폰이 열 수 있는 링크가 나온다 — 없으면 Expo 웹 기본 포트로 떨어진다.
 */
function resolveAppOrigin(): string {
  const configured = process.env['EXPO_PUBLIC_APP_URL']
  if (configured !== undefined && configured !== '') return configured
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin
  return `http://${fallbackHost}:8081`
}

export const APP_ORIGIN = resolveAppOrigin()
