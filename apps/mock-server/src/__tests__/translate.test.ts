import { readFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TRANSLATION_CACHE_LIMIT,
  getTranslationCacheSize,
  mockTranslate,
  resetTranslateState,
  translateConversation,
  translateText,
} from '../translate'

/** Azure가 성공 응답을 주는 fetch 목. 호출마다 원문에 접두사를 붙여 되돌려준다. */
function stubAzureOk(prefix = 'AZ:'): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Array<{ Text: string }>
    const source = body[0]?.Text ?? ''
    return new Response(JSON.stringify([{ translations: [{ text: `${prefix}${source}` }] }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  resetTranslateState()
  vi.stubEnv('AZURE_TRANSLATOR_KEY', '')
  vi.stubEnv('AZURE_TRANSLATOR_REGION', '')
  vi.stubEnv('AZURE_TRANSLATOR_ENDPOINT', '')
  vi.stubEnv('AZURE_TRANSLATOR_TIMEOUT_MS', '')
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('폴백 체인', () => {
  it('출발 언어와 대상 언어가 같으면 원문을 그대로 돌려준다', async () => {
    const fetchMock = stubAzureOk()
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    const result = await translateConversation('안녕하세요', 'ko', 'ko')

    expect(result).toEqual({ text: '안녕하세요', source: 'identity', cached: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('사전에 있으면 API를 호출하지 않는다', async () => {
    const fetchMock = stubAzureOk()
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    const result = await translateConversation('My head hurts.', 'en', 'ko')

    expect(result.text).toBe('머리가 아파요.')
    expect(result.source).toBe('dictionary')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('키가 없으면 API를 호출하지 않고 [demo] 폴백을 쓴다', async () => {
    const fetchMock = stubAzureOk()

    const toKo = await translateConversation('The weather is nice today.', 'en', 'ko')
    const toEn = await translateConversation('오늘 날씨가 좋네요.', 'ko', 'en')

    expect(toKo.text).toBe('[데모 번역] The weather is nice today.')
    expect(toEn.text).toBe('[demo] 오늘 날씨가 좋네요.')
    expect(toKo.source).toBe('demo')
    expect(toKo.failure?.kind).toBe('not-configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('빈 문자열/공백뿐인 키는 미설정으로 본다', async () => {
    const fetchMock = stubAzureOk()
    vi.stubEnv('AZURE_TRANSLATOR_KEY', '   ')

    const result = await translateConversation('Free text sentence.', 'en', 'ko')

    expect(result.failure?.kind).toBe('not-configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('키가 있으면 사전에 없는 자유 문장을 실번역하고 [demo] 마커가 없다', async () => {
    stubAzureOk('번역됨: ')
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    const result = await translateConversation('Free text sentence.', 'en', 'ko')

    expect(result.text).toBe('번역됨: Free text sentence.')
    expect(result.source).toBe('azure')
    expect(result.text).not.toContain('[demo]')
    expect(result.text).not.toContain('[데모 번역]')
    expect(result.failure).toBeUndefined()
  })

  it('API가 5xx를 주면 [demo]로 폴백하고 실패 사유를 남긴다', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 503 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    const result = await translateConversation('Free text sentence.', 'en', 'ko')

    expect(result.text).toBe('[데모 번역] Free text sentence.')
    expect(result.source).toBe('demo')
    expect(result.failure).toMatchObject({ kind: 'server', status: 503, message: 'boom' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('네트워크 예외가 나도 던지지 않고 [demo]로 폴백한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      }),
    )
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    const result = await translateConversation('Free text sentence.', 'en', 'ko')

    expect(result.source).toBe('demo')
    expect(result.failure?.kind).toBe('network')
  })

  it('타임아웃(AbortSignal)은 network가 아니라 timeout으로 분류한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
      }),
    )
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    const result = await translateConversation('Free text sentence.', 'en', 'ko')

    expect(result.failure?.kind).toBe('timeout')
    expect(result.failure?.message).toContain('3000ms')
    expect(result.source).toBe('demo')
  })

  it('실패는 무음이 아니라 경고 로그로 남는다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    await translateConversation('Free text sentence.', 'en', 'ko')

    expect(warn).toHaveBeenCalledOnce()
    expect(String(warn.mock.calls[0]?.[0])).toContain('[translate]')
  })

  it('키 미설정은 장애가 아니므로 경고 로그를 남기지 않는다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await translateConversation('Free text sentence.', 'en', 'ko')

    expect(warn).not.toHaveBeenCalled()
  })
})

describe('LRU 캐시', () => {
  it('같은 문장을 반복하면 API를 다시 호출하지 않는다', async () => {
    const fetchMock = stubAzureOk()
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    const first = await translateConversation('Repeat me please.', 'en', 'ko')
    const second = await translateConversation('Repeat me please.', 'en', 'ko')

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(second.text).toBe(first.text)
    expect(first.cached).toBe(false)
    expect(second.cached).toBe(true)
    expect(second.source).toBe('azure')
  })

  it('대상 언어가 다르면 캐시가 갈린다', async () => {
    const fetchMock = stubAzureOk()
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    await translateConversation('Same source text.', 'en', 'ko')
    await translateConversation('Same source text.', 'en', 'ja')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(getTranslationCacheSize()).toBe(2)
  })

  it('실패한 번역은 캐시하지 않는다 — 복구되면 바로 실번역으로 돌아온다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('down', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ translations: [{ text: '복구됨' }] }]), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    const failed = await translateConversation('Flaky sentence.', 'en', 'ko')
    const recovered = await translateConversation('Flaky sentence.', 'en', 'ko')

    expect(failed.source).toBe('demo')
    expect(recovered.text).toBe('복구됨')
    expect(getTranslationCacheSize()).toBe(1)
  })

  it('상한(1,000건)을 넘으면 가장 오래된 항목부터 축출한다', async () => {
    stubAzureOk()
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    for (let i = 0; i < TRANSLATION_CACHE_LIMIT + 5; i += 1) {
      await translateConversation(`sentence number ${i}`, 'en', 'ko')
    }

    expect(getTranslationCacheSize()).toBe(TRANSLATION_CACHE_LIMIT)
  })

  it('축출된 항목은 API를 다시 호출하고, 남은 항목은 캐시로 답한다', async () => {
    const fetchMock = stubAzureOk()
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    for (let i = 0; i < TRANSLATION_CACHE_LIMIT; i += 1) {
      await translateConversation(`sentence number ${i}`, 'en', 'ko')
    }
    expect(fetchMock).toHaveBeenCalledTimes(TRANSLATION_CACHE_LIMIT)

    // 상한을 넘겨 가장 오래된 "sentence number 0"을 밀어낸다.
    await translateConversation('one more sentence', 'en', 'ko')
    expect(fetchMock).toHaveBeenCalledTimes(TRANSLATION_CACHE_LIMIT + 1)

    // 축출된 항목 → 재호출
    await translateConversation('sentence number 0', 'en', 'ko')
    expect(fetchMock).toHaveBeenCalledTimes(TRANSLATION_CACHE_LIMIT + 2)

    // 살아남은 항목 → 캐시 히트, 호출 없음
    const survivor = await translateConversation('sentence number 999', 'en', 'ko')
    expect(survivor.cached).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(TRANSLATION_CACHE_LIMIT + 2)
  })

  it('조회한 항목은 최신으로 갱신돼 먼저 축출되지 않는다 (LRU 재정렬)', async () => {
    const fetchMock = stubAzureOk()
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    for (let i = 0; i < TRANSLATION_CACHE_LIMIT; i += 1) {
      await translateConversation(`sentence number ${i}`, 'en', 'ko')
    }
    // 가장 오래된 항목을 한 번 건드려 맨 뒤로 보낸다.
    await translateConversation('sentence number 0', 'en', 'ko')
    const callsAfterTouch = fetchMock.mock.calls.length

    // 새 항목 하나 → 이제는 "sentence number 1"이 축출 대상.
    await translateConversation('brand new sentence', 'en', 'ko')

    const touched = await translateConversation('sentence number 0', 'en', 'ko')
    expect(touched.cached).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(callsAfterTouch + 1)

    const evicted = await translateConversation('sentence number 1', 'en', 'ko')
    expect(evicted.cached).toBe(false)
  })
})

describe('연속 실패 차단기', () => {
  it('연속 실패가 쌓이면 API 호출을 잠시 건너뛰고 바로 폴백한다', async () => {
    const fetchMock = vi.fn(async () => new Response('down', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    for (let i = 0; i < 3; i += 1) {
      await translateConversation(`outage sentence ${i}`, 'en', 'ko')
    }
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const skipped = await translateConversation('outage sentence 3', 'en', 'ko')

    expect(fetchMock).toHaveBeenCalledTimes(3) // 더 호출하지 않는다
    expect(skipped.source).toBe('demo')
    expect(skipped.failure?.message).toContain('cooldown')
  })

  it('성공하면 실패 카운트가 초기화된다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('down', { status: 500 }))
      .mockResolvedValueOnce(new Response('down', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ translations: [{ text: 'ok' }] }]), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response('down', { status: 500 }))
      .mockResolvedValueOnce(new Response('down', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    for (let i = 0; i < 5; i += 1) {
      await translateConversation(`mixed sentence ${i}`, 'en', 'ko')
    }

    // 3연속이 아니었으므로 차단기가 열리지 않아 5번 모두 호출됐다.
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })
})

describe('mockTranslate (동기 · 기존 시그니처 유지)', () => {
  it('사전과 [demo] 폴백은 기존 동작 그대로다', () => {
    expect(mockTranslate('Hello', 'en', 'ko')).toBe('안녕하세요.')
    expect(mockTranslate('안녕', 'ko', 'ko')).toBe('안녕')
    expect(mockTranslate('Unknown sentence.', 'en', 'ko')).toBe('[데모 번역] Unknown sentence.')
    expect(mockTranslate('모르는 문장.', 'ko', 'en')).toBe('[demo] 모르는 문장.')
  })

  it('키가 있어도 네트워크를 타지 않는다 (동기 경로는 Azure를 건너뛴다)', () => {
    const fetchMock = stubAzureOk()
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    expect(mockTranslate('Unknown sentence.', 'en', 'ko')).toBe('[데모 번역] Unknown sentence.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('비동기 경로가 캐시에 채워 둔 결과는 재활용한다', async () => {
    stubAzureOk('AZ:')
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    await translateConversation('Shared sentence.', 'en', 'ko')

    expect(mockTranslate('Shared sentence.', 'en', 'ko')).toBe('AZ:Shared sentence.')
  })
})

describe('translateText 래퍼', () => {
  it('translateConversation의 text만 돌려준다', async () => {
    stubAzureOk('AZ:')
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    await expect(translateText('Wrapper sentence.', 'en', 'ko')).resolves.toBe(
      'AZ:Wrapper sentence.',
    )
  })

  it('키가 없으면 기존 mockTranslate와 같은 문자열을 낸다 (회귀 없음)', async () => {
    for (const [text, from, to] of [
      ['Hello', 'en', 'ko'],
      ['My head hurts.', 'en', 'ko'],
      ['Unknown sentence.', 'en', 'ko'],
      ['모르는 문장.', 'ko', 'en'],
      ['그대로', 'ko', 'ko'],
    ] as const) {
      await expect(translateText(text, from, to)).resolves.toBe(mockTranslate(text, from, to))
    }
  })
})

describe('범위 경계 — Symposia 자막은 이 모듈을 쓰지 않는다', () => {
  // 자막은 data/keynote.ts의 스크립트 내장 번역이라야 같은 강연이 항상 같은 품질로
  // 재생된다(데모 결정성). 이 가드가 깨졌다면 자막이 API 번역을 타기 시작했다는 뜻이다.
  it.each(['sse.ts', 'server.ts', 'data/keynote.ts'])(
    '%s는 translate 모듈을 import 하지 않는다',
    async (relative) => {
      const source = await readFile(new URL(`../${relative}`, import.meta.url), 'utf8')

      expect(source, `${relative}가 translate 모듈을 import 한다 — Symposia 자막은 API 대상이 아니다`)
        .not.toMatch(/from\s+['"]\.{1,2}\/(?:\.\.\/)?(?:translate|azure-translator)['"]/)
    },
  )

  it('CareTalk 대화(conversation.ts)만 translate 모듈을 쓴다', async () => {
    const source = await readFile(new URL('../conversation.ts', import.meta.url), 'utf8')

    expect(source).toMatch(/from\s+['"]\.\/translate['"]/)
  })
})
