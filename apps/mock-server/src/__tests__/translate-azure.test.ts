/**
 * Azure Translator 호출부 계약 검증 — 요청 형식과 응답 파싱만 mock으로 확인한다.
 * 실키 스모크는 수동 절차(`apps/mock-server/README.md`)로 남긴다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_AZURE_ENDPOINT,
  DEFAULT_AZURE_TIMEOUT_MS,
  callAzureTranslator,
  resolveAzureConfig,
  toAzureLang,
  type AzureTranslatorConfig,
} from '../azure-translator'

const config: AzureTranslatorConfig = {
  key: 'test-key',
  region: 'koreacentral',
  endpoint: DEFAULT_AZURE_ENDPOINT,
  timeoutMs: 3000,
}

function okResponse(text: string): Response {
  return new Response(JSON.stringify([{ translations: [{ text, to: 'ko' }] }]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** 마지막 fetch 호출의 (url, init)을 꺼낸다. */
function lastCall(fetchMock: ReturnType<typeof vi.fn>): { url: URL; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
  return { url: new URL(url), init }
}

beforeEach(() => {
  vi.stubEnv('AZURE_TRANSLATOR_KEY', '')
  vi.stubEnv('AZURE_TRANSLATOR_REGION', '')
  vi.stubEnv('AZURE_TRANSLATOR_ENDPOINT', '')
  vi.stubEnv('AZURE_TRANSLATOR_TIMEOUT_MS', '')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('resolveAzureConfig', () => {
  it('키가 없으면 null — 2단계를 통째로 건너뛴다', () => {
    expect(resolveAzureConfig({})).toBeNull()
    expect(resolveAzureConfig({ AZURE_TRANSLATOR_KEY: '' })).toBeNull()
    expect(resolveAzureConfig({ AZURE_TRANSLATOR_KEY: '  \t ' })).toBeNull()
  })

  it('키만 있으면 전역 엔드포인트와 3초 타임아웃을 기본값으로 쓴다', () => {
    expect(resolveAzureConfig({ AZURE_TRANSLATOR_KEY: 'k' })).toEqual({
      key: 'k',
      region: undefined,
      endpoint: DEFAULT_AZURE_ENDPOINT,
      timeoutMs: DEFAULT_AZURE_TIMEOUT_MS,
    })
    expect(DEFAULT_AZURE_TIMEOUT_MS).toBe(3000)
  })

  it('region/endpoint/timeout 환경변수를 반영하고 엔드포인트 끝 슬래시를 정리한다', () => {
    expect(
      resolveAzureConfig({
        AZURE_TRANSLATOR_KEY: 'k',
        AZURE_TRANSLATOR_REGION: 'koreacentral',
        AZURE_TRANSLATOR_ENDPOINT: 'https://my-resource.cognitiveservices.azure.com//',
        AZURE_TRANSLATOR_TIMEOUT_MS: '1500',
      }),
    ).toEqual({
      key: 'k',
      region: 'koreacentral',
      endpoint: 'https://my-resource.cognitiveservices.azure.com',
      timeoutMs: 1500,
    })
  })

  it('타임아웃이 숫자가 아니거나 0 이하면 기본값으로 되돌린다', () => {
    for (const raw of ['abc', '0', '-5', '']) {
      expect(resolveAzureConfig({ AZURE_TRANSLATOR_KEY: 'k', AZURE_TRANSLATOR_TIMEOUT_MS: raw }))
        .toMatchObject({ timeoutMs: DEFAULT_AZURE_TIMEOUT_MS })
    }
  })
})

describe('toAzureLang', () => {
  it('zh는 간체(zh-Hans)로 고정하고 나머지는 그대로 쓴다', () => {
    expect(toAzureLang('zh')).toBe('zh-Hans')
    expect(toAzureLang('ko')).toBe('ko')
    expect(toAzureLang('en')).toBe('en')
    expect(toAzureLang('ja')).toBe('ja')
  })
})

describe('요청 형식 계약', () => {
  it('v3.0 /translate에 from/to 쿼리와 키·리전 헤더, [{Text}] 본문을 보낸다', async () => {
    const fetchMock = vi.fn(async () => okResponse('안녕하세요'))
    vi.stubGlobal('fetch', fetchMock)

    await callAzureTranslator('Hello there', 'en', 'ko', config)

    const { url, init } = lastCall(fetchMock)
    expect(url.origin + url.pathname).toBe(`${DEFAULT_AZURE_ENDPOINT}/translate`)
    expect(url.searchParams.get('api-version')).toBe('3.0')
    expect(url.searchParams.get('from')).toBe('en')
    expect(url.searchParams.get('to')).toBe('ko')

    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      'Ocp-Apim-Subscription-Key': 'test-key',
      'Ocp-Apim-Subscription-Region': 'koreacentral',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(init.body))).toEqual([{ Text: 'Hello there' }])
  })

  it('리전이 없으면 Region 헤더를 아예 보내지 않는다', async () => {
    const fetchMock = vi.fn(async () => okResponse('안녕하세요'))
    vi.stubGlobal('fetch', fetchMock)

    await callAzureTranslator('Hello', 'en', 'ko', { ...config, region: undefined })

    expect(lastCall(fetchMock).init.headers).not.toHaveProperty('Ocp-Apim-Subscription-Region')
  })

  it('zh 대상은 zh-Hans로 변환해 보낸다', async () => {
    const fetchMock = vi.fn(async () => okResponse('你好'))
    vi.stubGlobal('fetch', fetchMock)

    await callAzureTranslator('안녕하세요', 'ko', 'zh', config)

    const { url } = lastCall(fetchMock)
    expect(url.searchParams.get('from')).toBe('ko')
    expect(url.searchParams.get('to')).toBe('zh-Hans')
  })

  it('설정된 타임아웃으로 AbortSignal을 건다', async () => {
    const fetchMock = vi.fn(async () => okResponse('안녕하세요'))
    vi.stubGlobal('fetch', fetchMock)
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout')

    await callAzureTranslator('Hello', 'en', 'ko', { ...config, timeoutMs: 3000 })

    expect(timeoutSpy).toHaveBeenCalledWith(3000)
    expect(lastCall(fetchMock).init.signal).toBeInstanceOf(AbortSignal)
  })

  it('커스텀 엔드포인트를 그대로 쓴다', async () => {
    const fetchMock = vi.fn(async () => okResponse('안녕하세요'))
    vi.stubGlobal('fetch', fetchMock)

    await callAzureTranslator('Hello', 'en', 'ko', {
      ...config,
      endpoint: 'https://my-resource.cognitiveservices.azure.com',
    })

    expect(lastCall(fetchMock).url.origin).toBe('https://my-resource.cognitiveservices.azure.com')
  })
})

describe('응답 파싱 계약', () => {
  it('[{translations:[{text}]}]에서 첫 번역문을 꺼낸다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify([
              {
                detectedLanguage: { language: 'en', score: 1 },
                translations: [{ text: '머리가 아파요.', to: 'ko' }],
              },
            ]),
            { status: 200 },
          ),
      ),
    )

    await expect(callAzureTranslator('My head hurts', 'en', 'ko', config)).resolves.toEqual({
      ok: true,
      text: '머리가 아파요.',
    })
  })

  it.each([
    ['배열이 아님', JSON.stringify({ translations: [{ text: 'x' }] })],
    ['빈 배열', '[]'],
    ['translations 없음', JSON.stringify([{ detectedLanguage: { language: 'en' } }])],
    ['빈 translations', JSON.stringify([{ translations: [] }])],
    ['text가 문자열이 아님', JSON.stringify([{ translations: [{ text: 42 }] }])],
    ['text가 빈 문자열', JSON.stringify([{ translations: [{ text: '' }] }])],
  ])('예상 밖 응답 형태(%s)는 bad-response로 분류한다', async (_label, body) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status: 200 })))

    const outcome = await callAzureTranslator('Hello', 'en', 'ko', config)

    expect(outcome).toMatchObject({ ok: false, failure: { kind: 'bad-response', status: 200 } })
  })

  it('200인데 JSON이 아니면 bad-response로 분류한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>oops</html>', { status: 200 })))

    const outcome = await callAzureTranslator('Hello', 'en', 'ko', config)

    expect(outcome).toMatchObject({ ok: false, failure: { kind: 'bad-response' } })
  })
})

describe('HTTP 에러 매핑', () => {
  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [429, 'rate-limit'],
    [400, 'client'],
    [404, 'client'],
    [500, 'server'],
    [503, 'server'],
  ])('%i → %s', async (status, kind) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: status * 1000, message: 'nope' } }), {
            status,
          }),
      ),
    )

    const outcome = await callAzureTranslator('Hello', 'en', 'ko', config)

    expect(outcome).toEqual({ ok: false, failure: { kind, status, message: 'nope' } })
  })

  it('에러 본문이 JSON이 아니면 원문을 잘라서 메시지로 쓴다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('gateway timeout', { status: 504 })))

    const outcome = await callAzureTranslator('Hello', 'en', 'ko', config)

    expect(outcome).toMatchObject({ ok: false, failure: { kind: 'server', message: 'gateway timeout' } })
  })

  it('타임아웃과 네트워크 에러를 구분하고, 예외를 던지지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('aborted', 'TimeoutError')
      }),
    )
    await expect(callAzureTranslator('Hello', 'en', 'ko', config)).resolves.toMatchObject({
      ok: false,
      failure: { kind: 'timeout' },
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      }),
    )
    await expect(callAzureTranslator('Hello', 'en', 'ko', config)).resolves.toMatchObject({
      ok: false,
      failure: { kind: 'network', message: 'fetch failed' },
    })
  })
})
