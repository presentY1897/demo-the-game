import { describe, expect, it } from 'vitest'
import { semanticColor } from '@thegame/tokens'
import { selectStageView } from '../stores/captionSelectors'
import type { CaptionEntry } from '../stores/captionStore'
import { resolveThemeMode, statusBarStyle, systemThemeMode, themeColors } from '../theme/mode'

const entry = (over: Partial<CaptionEntry> & { id: string }): CaptionEntry => ({
  sourceText: '',
  isFinal: false,
  translations: {},
  ...over,
})

describe('themeColors', () => {
  it('모드별로 토큰의 해당 세트를 그대로 준다', () => {
    expect(themeColors('light')).toEqual(semanticColor.light)
    expect(themeColors('dark')).toEqual(semanticColor.dark)
  })

  it('두 세트의 키가 어긋나지 않는다', () => {
    expect(Object.keys(semanticColor.dark).sort()).toEqual(Object.keys(semanticColor.light).sort())
  })

  it('라이트와 다크의 배경·본문 색이 실제로 다르다', () => {
    expect(themeColors('dark').bg).not.toBe(themeColors('light').bg)
    expect(themeColors('dark').text).not.toBe(themeColors('light').text)
  })
})

describe('systemThemeMode', () => {
  it('시스템 다크 설정을 따른다', () => {
    expect(systemThemeMode('dark')).toBe('dark')
    expect(systemThemeMode('light')).toBe('light')
  })

  it('시스템 값을 못 읽으면 라이트가 기본', () => {
    expect(systemThemeMode(null)).toBe('light')
    expect(systemThemeMode(undefined)).toBe('light')
    expect(systemThemeMode('unspecified')).toBe('light')
  })
})

describe('resolveThemeMode', () => {
  it('스테이지 모드가 꺼져 있으면 시스템 설정을 따른다', () => {
    expect(resolveThemeMode({ scheme: 'dark', stageMode: false })).toBe('dark')
    expect(resolveThemeMode({ scheme: 'light', stageMode: false })).toBe('light')
    expect(resolveThemeMode({ scheme: null, stageMode: false })).toBe('light')
  })

  it('스테이지 모드는 시스템 라이트 설정보다 우선한다 (강제 다크)', () => {
    expect(resolveThemeMode({ scheme: 'light', stageMode: true })).toBe('dark')
    expect(resolveThemeMode({ scheme: null, stageMode: true })).toBe('dark')
    expect(resolveThemeMode({ scheme: 'dark', stageMode: true })).toBe('dark')
  })

  it('상태바는 다크에서 밝은 글자가 된다', () => {
    expect(statusBarStyle('dark')).toBe('light')
    expect(statusBarStyle('light')).toBe('dark')
  })
})

describe('selectStageView', () => {
  it('자막이 없으면 둘 다 null', () => {
    expect(selectStageView([])).toEqual({ latestFinal: null, partial: null })
  })

  it('최신 확정 1건 + 그 뒤의 진행 중 부분 자막만 고른다', () => {
    const entries = [
      entry({ id: '1', sourceText: 'first', isFinal: true }),
      entry({ id: '2', sourceText: 'second', isFinal: true, translations: { en: '둘' } }),
      entry({ id: '3', sourceText: 'third in progress' }),
    ]

    expect(selectStageView(entries)).toEqual({
      latestFinal: entries[1],
      partial: entries[2],
    })
  })

  it('진행 중 자막이 없으면 확정 1건만 고른다', () => {
    const entries = [
      entry({ id: '1', sourceText: 'first', isFinal: true }),
      entry({ id: '2', sourceText: 'second', isFinal: true }),
    ]

    expect(selectStageView(entries)).toEqual({ latestFinal: entries[1], partial: null })
  })

  it('확정 자막이 아직 없으면 부분 자막만 고른다', () => {
    const entries = [entry({ id: '1', sourceText: 'opening line' })]

    expect(selectStageView(entries)).toEqual({ latestFinal: null, partial: entries[0] })
  })

  it('최신 확정 자막보다 앞선 비확정 항목은 버린다', () => {
    const entries = [
      entry({ id: '1', sourceText: 'stale partial' }),
      entry({ id: '2', sourceText: 'latest final', isFinal: true }),
    ]

    expect(selectStageView(entries)).toEqual({ latestFinal: entries[1], partial: null })
  })

  it('번역만 먼저 도착해 원문이 빈 항목은 부분 자막이 아니다', () => {
    const entries = [
      entry({ id: '1', sourceText: 'final line', isFinal: true }),
      entry({ id: '2', translations: { en: 'translation only' } }),
    ]

    expect(selectStageView(entries)).toEqual({ latestFinal: entries[0], partial: null })
  })

  it('부분 자막이 여러 건이면 가장 최신 것만 고른다', () => {
    const entries = [
      entry({ id: '1', sourceText: 'older partial' }),
      entry({ id: '2', sourceText: 'newest partial' }),
    ]

    expect(selectStageView(entries).partial).toBe(entries[1])
  })

  it('히스토리를 잘라내지 않는다 — 스토어 배열은 그대로 (뷰만 전환)', () => {
    const entries = [
      entry({ id: '1', sourceText: 'a', isFinal: true }),
      entry({ id: '2', sourceText: 'b', isFinal: true }),
      entry({ id: '3', sourceText: 'c' }),
    ]
    const snapshot = [...entries]

    selectStageView(entries)

    expect(entries).toEqual(snapshot)
  })
})
