import { decodeApiError, type DecodeResult } from '@thegame/realtime'
import { API_BASE } from '../config'

/**
 * 목 서버 HTTP 호출의 공통 껍데기.
 *
 * 본문 검증은 전부 `@thegame/realtime`의 decode 함수에 위임한다 — 화면 코드가
 * 응답을 캐스팅하거나 직접 파싱하지 않는다(ADR-0005/0008, eslint로도 강제).
 * 실패는 던지지 않고 **안정 코드가 붙은 값**으로 돌려준다: 화면이 `not-found`처럼
 * 사용자에게 설명할 수 있는 실패와 그렇지 않은 실패를 구분해 다루기 위해서다.
 */
export interface ApiFailure {
  /** 서버의 안정 코드(`not-found` 등) 또는 클라이언트 측 `network`/`invalid-body` */
  code: string
  message: string
}

export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: ApiFailure }

export async function requestJson<T>(
  path: string,
  decode: (value: unknown) => DecodeResult<T>,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, init)
  } catch (cause) {
    return {
      ok: false,
      error: {
        code: 'network',
        message: cause instanceof Error ? cause.message : String(cause),
      },
    }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { ok: false, error: { code: 'invalid-json', message: `HTTP ${response.status}` } }
  }

  if (!response.ok) {
    const failure = decodeApiError(body)
    if (failure.ok) {
      return {
        ok: false,
        error: {
          code: failure.value.error,
          message: failure.value.message ?? `HTTP ${response.status}`,
        },
      }
    }
    return { ok: false, error: { code: 'invalid-body', message: `HTTP ${response.status}` } }
  }

  const decoded = decode(body)
  if (!decoded.ok) {
    return { ok: false, error: { code: 'invalid-body', message: decoded.error.message } }
  }
  return { ok: true, value: decoded.value }
}

/** TanStack Query처럼 throw를 기대하는 호출부용 어댑터 */
export async function requestOrThrow<T>(
  path: string,
  decode: (value: unknown) => DecodeResult<T>,
  init?: RequestInit,
): Promise<T> {
  const result = await requestJson(path, decode, init)
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
  return result.value
}
