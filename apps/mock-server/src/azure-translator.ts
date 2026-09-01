/**
 * Azure Translator (Text Translation v3.0) 클라이언트 — 번역 폴백 체인의 2단계.
 *
 * 이 모듈은 **호출과 에러 매핑만** 담당한다. 폴백 판단·캐시·로깅은 `translate.ts`가 한다.
 * 키가 없으면 `resolveAzureConfig`가 `null`을 돌려주고, 호출 자체가 일어나지 않는다
 * (저장소 클론만으로 실행 가능 — 키는 선택 사항).
 *
 * 참고: https://learn.microsoft.com/azure/ai-services/translator/text-translation/reference/v3/translate
 */

/** 전역(글로벌) 엔드포인트. 지역 전용 리소스는 `AZURE_TRANSLATOR_ENDPOINT`로 덮어쓴다. */
export const DEFAULT_AZURE_ENDPOINT = 'https://api.cognitive.microsofttranslator.com'
export const DEFAULT_AZURE_TIMEOUT_MS = 3000

/**
 * 번역 실패 종류. 무음 실패 금지 규칙에 따라 폴백 결과와 **함께** 호출부까지 전달된다.
 * - `not-configured`는 장애가 아니라 "키 미설정"이라 경고 로그를 남기지 않는다.
 */
export type TranslationFailureKind =
  | 'not-configured'
  | 'timeout'
  | 'network'
  | 'auth'
  | 'rate-limit'
  | 'server'
  | 'client'
  | 'bad-response'

export interface TranslationFailure {
  kind: TranslationFailureKind
  message: string
  /** HTTP 응답을 받은 경우에만 채워진다 (타임아웃/네트워크 에러는 없음). */
  status?: number
}

export interface AzureTranslatorConfig {
  key: string
  /** 지역 전용 리소스일 때만 필요 — 있으면 `Ocp-Apim-Subscription-Region` 헤더로 나간다. */
  region?: string
  endpoint: string
  timeoutMs: number
}

export type AzureTranslateOutcome =
  | { ok: true; text: string }
  | { ok: false; failure: TranslationFailure }

/**
 * 환경변수에서 Azure 설정을 읽는다. 키가 없으면 `null` — 2단계를 통째로 건너뛰라는 신호.
 * 매 호출마다 읽으므로 테스트에서 `process.env`를 바꾸면 즉시 반영된다.
 */
export function resolveAzureConfig(
  env: NodeJS.ProcessEnv = process.env,
): AzureTranslatorConfig | null {
  const key = env.AZURE_TRANSLATOR_KEY?.trim()
  if (!key) return null

  const region = env.AZURE_TRANSLATOR_REGION?.trim() || undefined
  const endpoint = (env.AZURE_TRANSLATOR_ENDPOINT?.trim() || DEFAULT_AZURE_ENDPOINT).replace(
    /\/+$/,
    '',
  )

  const rawTimeout = Number(env.AZURE_TRANSLATOR_TIMEOUT_MS)
  const timeoutMs =
    Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : DEFAULT_AZURE_TIMEOUT_MS

  return { key, region, endpoint, timeoutMs }
}

/**
 * 앱 내부 언어 코드 → Azure 언어 코드.
 * 앱은 `zh`를 쓰지만 Azure는 간체/번체를 구분하므로 간체(`zh-Hans`)로 고정한다.
 */
export function toAzureLang(lang: string): string {
  return lang === 'zh' ? 'zh-Hans' : lang
}

function mapStatus(status: number): TranslationFailureKind {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate-limit'
  if (status >= 500) return 'server'
  return 'client'
}

/** Azure 에러 본문(`{"error":{"code":…,"message":…}}`)에서 메시지만 뽑아낸다. */
function describeErrorBody(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body)
    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      const error = (parsed as { error?: { message?: unknown } }).error
      if (error && typeof error.message === 'string') return error.message
    }
  } catch {
    // 에러 본문이 JSON이 아닐 수도 있다 — 원문을 잘라서 그대로 쓴다.
  }
  return body.slice(0, 200)
}

/** 응답 스키마: `[{ translations: [{ text, to }] }]` */
function parseTranslation(payload: unknown): string | null {
  if (!Array.isArray(payload)) return null
  const first: unknown = payload[0]
  if (!first || typeof first !== 'object') return null
  const translations = (first as { translations?: unknown }).translations
  if (!Array.isArray(translations)) return null
  const candidate: unknown = translations[0]
  if (!candidate || typeof candidate !== 'object') return null
  const text = (candidate as { text?: unknown }).text
  return typeof text === 'string' && text.length > 0 ? text : null
}

/**
 * 단일 문장을 번역한다. **예외를 던지지 않는다** — 모든 실패는 `{ ok: false, failure }`로
 * 내려가고, 폴백 여부는 호출부가 정한다.
 */
export async function callAzureTranslator(
  text: string,
  from: string,
  to: string,
  config: AzureTranslatorConfig,
): Promise<AzureTranslateOutcome> {
  const url = new URL(`${config.endpoint}/translate`)
  url.searchParams.set('api-version', '3.0')
  url.searchParams.set('from', toAzureLang(from))
  url.searchParams.set('to', toAzureLang(to))

  const headers: Record<string, string> = {
    'Ocp-Apim-Subscription-Key': config.key,
    'Content-Type': 'application/json',
  }
  if (config.region) headers['Ocp-Apim-Subscription-Region'] = config.region

  let response: Response
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify([{ Text: text }]),
      signal: AbortSignal.timeout(config.timeoutMs),
    })
  } catch (cause) {
    // 타임아웃과 그 밖의 네트워크 에러를 구분한다 (에러 종류 구분 규칙).
    const name = cause instanceof Error ? cause.name : ''
    const isTimeout = name === 'TimeoutError' || name === 'AbortError'
    return {
      ok: false,
      failure: {
        kind: isTimeout ? 'timeout' : 'network',
        message: isTimeout
          ? `Azure Translator did not respond within ${config.timeoutMs}ms`
          : cause instanceof Error
            ? cause.message
            : String(cause),
      },
    }
  }

  if (!response.ok) {
    let body = ''
    try {
      body = await response.text()
    } catch {
      // 본문을 못 읽어도 상태 코드만으로 충분히 분류된다.
    }
    return {
      ok: false,
      failure: {
        kind: mapStatus(response.status),
        status: response.status,
        message: describeErrorBody(body) || `HTTP ${response.status}`,
      },
    }
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (cause) {
    return {
      ok: false,
      failure: {
        kind: 'bad-response',
        status: response.status,
        message: cause instanceof Error ? cause.message : 'Response body was not JSON',
      },
    }
  }

  const translated = parseTranslation(payload)
  if (translated === null) {
    return {
      ok: false,
      failure: {
        kind: 'bad-response',
        status: response.status,
        message: 'Unexpected response shape: expected [{ translations: [{ text }] }]',
      },
    }
  }

  return { ok: true, text: translated }
}
