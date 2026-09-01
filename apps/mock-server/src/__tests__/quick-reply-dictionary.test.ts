import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  QUICK_REPLY_LOCALES,
  quickRepliesFor,
  quickReplyPhrases,
  quickReplyTranslationPairs,
  type QuickReplyLocale,
} from '@thegame/i18n'
import {
  getDictionarySize,
  mockTranslate,
  resetTranslateState,
  translateConversation,
} from '../translate'

/**
 * S05 완성 기준 2·4의 검증 — **원천 단일화**가 실제로 동작하는지 본다.
 *
 * 퀵 리플라이 칩에 찍히는 문구는 `packages/i18n` 카탈로그가 유일한 원천이고,
 * 서버 사전은 그 표에서 만들어진다. 그러므로 칩으로 보낸 말은 어떤 언어 방향에서도
 * `[demo]` 폴백으로 떨어질 수 없다 — 떨어진다면 원천이 갈라졌다는 뜻이고 여기서 걸린다.
 *
 * Azure 키를 일부러 비워 두고 검사한다: 1단계(사전)만으로 100%여야 한다.
 */

const DEMO_MARKERS = ['[demo]', '[데모 번역]']

const directions: Array<[QuickReplyLocale, QuickReplyLocale]> = QUICK_REPLY_LOCALES.flatMap(
  (from) =>
    QUICK_REPLY_LOCALES.filter((to) => to !== from).map(
      (to) => [from, to] as [QuickReplyLocale, QuickReplyLocale],
    ),
)

beforeEach(() => {
  resetTranslateState()
  // 키가 없는 상태 = 저장소를 갓 클론한 리뷰어의 환경
  vi.stubEnv('AZURE_TRANSLATOR_KEY', '')
  vi.stubEnv('AZURE_TRANSLATOR_REGION', '')
  vi.stubEnv('AZURE_TRANSLATOR_ENDPOINT', '')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('퀵 리플라이 문구 커버리지 — [demo] 폴백 0건', () => {
  it.each(directions)('%s → %s: 카탈로그 전 문구가 사전에 있다', async (from, to) => {
    const missing: string[] = []
    const mistranslated: string[] = []

    for (const phrase of quickReplyPhrases) {
      const source = phrase.text[from]
      const result = await translateConversation(source, from, to)
      if (DEMO_MARKERS.some((marker) => result.text.includes(marker))) {
        missing.push(`${phrase.id}: "${source}"`)
        continue
      }
      if (result.text !== phrase.text[to]) {
        mistranslated.push(`${phrase.id}: "${result.text}" ≠ "${phrase.text[to]}"`)
      }
      expect(result.source).toBe('dictionary')
    }

    expect(missing, `사전에 없는 문구 (${from}→${to})`).toEqual([])
    expect(mistranslated, `카탈로그와 다른 번역 (${from}→${to})`).toEqual([])
  })

  it('화면이 실제로 그리는 칩 전부가 커버된다 (역할 × 언어)', () => {
    const uncovered: string[] = []

    for (const role of ['patient', 'staff'] as const) {
      for (const [from, to] of directions) {
        for (const group of quickRepliesFor(role, from)) {
          for (const chip of group.chips) {
            const translated = mockTranslate(chip.text, from, to)
            if (DEMO_MARKERS.some((marker) => translated.includes(marker))) {
              uncovered.push(`${role}/${chip.id} ${from}→${to}: "${chip.text}"`)
            }
          }
        }
      }
    }

    expect(uncovered, '칩으로 보낼 수 있는데 번역이 안 붙는 문구').toEqual([])
  })

  it('칩 목록이 비어 있지 않다 — 커버리지 검사가 헛돌지 않게', () => {
    for (const role of ['patient', 'staff'] as const) {
      for (const lang of QUICK_REPLY_LOCALES) {
        const groups = quickRepliesFor(role, lang)
        const chipCount = groups.reduce((sum, group) => sum + group.chips.length, 0)
        expect(groups.length, `${role}/${lang} 그룹`).toBeGreaterThanOrEqual(3)
        expect(chipCount, `${role}/${lang} 칩 수`).toBeGreaterThanOrEqual(8)
      }
    }
  })

  it('사전 매칭은 대소문자·문장부호 차이를 넘어선다', () => {
    expect(mockTranslate('MY HEAD HURTS', 'en', 'ko')).toBe('머리가 아파요.')
    expect(mockTranslate('  Hello  ', 'en', 'ko')).toBe('안녕하세요.')
    expect(mockTranslate('こんにちは', 'ja', 'ko')).toBe('안녕하세요.')
  })

  it('이형(alias)도 사전에 실린다 — 자유 입력으로 들어와도 번역된다', () => {
    expect(mockTranslate('hi', 'en', 'ko')).toBe('안녕하세요.')
    expect(mockTranslate('I have a headache.', 'en', 'ko')).toBe('머리가 아파요.')
    expect(mockTranslate('두통이 있어요.', 'ko', 'en')).toBe('My head hurts.')
  })

  it('Azure 키가 있어도 퀵 리플라이는 API를 타지 않는다 (사전이 1단계)', async () => {
    const fetchMock = vi.fn(async () => new Response('should not be called', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('AZURE_TRANSLATOR_KEY', 'test-key')

    for (const phrase of quickReplyPhrases) {
      await translateConversation(phrase.text.en, 'en', 'ko')
    }

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('사전 열쇠가 충돌하지 않는다 (같은 원문이 다른 번역으로 덮이지 않음)', () => {
    const normalize = (text: string): string =>
      text.toLowerCase().replace(/[.,!?。、！？]/g, '').replace(/\s+/g, ' ').trim()

    const seen = new Map<string, string>()
    const conflicts: string[] = []
    for (const { from, to, source, target } of quickReplyTranslationPairs()) {
      const key = `${from} ${to} ${normalize(source)}`
      const existing = seen.get(key)
      if (existing !== undefined && existing !== target) {
        conflicts.push(`${key}: "${existing}" vs "${target}"`)
      }
      seen.set(key, target)
    }

    expect(conflicts, '같은 열쇠에 서로 다른 번역').toEqual([])
    // 서버 사전이 카탈로그를 통째로 실었는지 (조용히 일부만 실리는 일이 없게)
    expect(getDictionarySize()).toBe(seen.size)
  })

  it('사전 밖 문장은 여전히 [demo]로 떨어진다 — 폴백을 없앤 게 아니다', async () => {
    const result = await translateConversation('오늘 날씨가 좋네요.', 'ko', 'en')

    expect(result.source).toBe('demo')
    expect(result.text).toBe('[demo] 오늘 날씨가 좋네요.')
  })
})
