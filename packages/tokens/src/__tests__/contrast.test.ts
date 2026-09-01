import { describe, expect, it } from 'vitest'
import { semanticColor, type SemanticColorName, type ThemeMode } from '../color'
import {
  WCAG_AA,
  contrastRatio,
  excludedPairs,
  nonTextPairs,
  relativeLuminance,
  textPairs,
  tokenContrast,
} from '../contrast'

const modes: ThemeMode[] = ['light', 'dark']

/** 실패 메시지에 실제 색과 수치를 같이 실어야 토큰을 고칠 수 있다 */
const describePair = (mode: ThemeMode, fg: SemanticColorName, bg: SemanticColorName, min: number) => {
  const fgHex = semanticColor[mode][fg]
  const bgHex = semanticColor[mode][bg]
  const ratio = contrastRatio(fgHex, bgHex)
  return `${mode} ${fg}(${fgHex}) on ${bg}(${bgHex}) = ${ratio.toFixed(2)}:1 (기준 ${min}:1)`
}

describe('대비 계산', () => {
  it('WCAG 2.1 기준값을 재현한다', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
    expect(contrastRatio('#000000', '#000000')).toBeCloseTo(1, 5)
    // 순서를 바꿔도 같은 값
    expect(contrastRatio('#0E837E', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#0E837E'), 10)
    // 널리 검증된 참조값 (WebAIM)
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2)
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 10)
  })

  it('#RRGGBB가 아닌 값은 거부한다 — 조용히 0을 돌려주면 검사가 무력해진다', () => {
    expect(() => contrastRatio('rgb(0,0,0)', '#FFFFFF')).toThrow()
    expect(() => contrastRatio('#FFF', '#FFFFFF')).toThrow()
  })
})

describe('검사 대상 조합 목록', () => {
  it('모든 조합이 실제 토큰 이름을 가리킨다', () => {
    const names = new Set(Object.keys(semanticColor.light))
    for (const { fg, bg } of [...textPairs, ...nonTextPairs, ...excludedPairs]) {
      expect(names, `${fg} / ${bg}`).toContain(fg)
      expect(names, `${fg} / ${bg}`).toContain(bg)
    }
  })

  it('조합마다 근거(usedAt)가 붙어 있다 — 곱집합 방지', () => {
    for (const pair of [...textPairs, ...nonTextPairs]) {
      expect(pair.usedAt.length, `${pair.fg} / ${pair.bg}`).toBeGreaterThan(0)
    }
    for (const pair of excludedPairs) {
      expect(pair.reason.length, `${pair.fg} / ${pair.bg}`).toBeGreaterThan(0)
    }
  })

  // 텍스트와 비텍스트는 기준이 달라 같은 조합이 양쪽에 있을 수 있다
  // (`primary`/`bg`는 링크 텍스트이자 포커스 아웃라인이다). 목록 안에서만 중복을 막는다.
  it.each([
    ['textPairs', textPairs],
    ['nonTextPairs', nonTextPairs],
  ] as const)('%s 안에 중복된 조합이 없다', (_name, pairs) => {
    const keys = pairs.map((p) => `${p.fg}/${p.bg}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('제외 목록과 검사 목록이 겹치지 않는다', () => {
    const checked = new Set([...textPairs, ...nonTextPairs].map((p) => `${p.fg}/${p.bg}`))
    for (const pair of excludedPairs) {
      expect(checked, `${pair.fg} / ${pair.bg}`).not.toContain(`${pair.fg}/${pair.bg}`)
    }
  })

  it('라이트·다크가 같은 토큰 집합을 갖는다 — 한쪽에만 있는 색은 검사에서 샌다', () => {
    expect(Object.keys(semanticColor.dark).sort()).toEqual(Object.keys(semanticColor.light).sort())
  })
})

describe.each(modes)('%s — 텍스트 대비 AA (4.5:1)', (mode) => {
  it.each(textPairs.map((p) => [`${p.fg} on ${p.bg}`, p] as const))('%s', (_name, pair) => {
    const ratio = tokenContrast(mode, pair.fg, pair.bg)
    expect(ratio, describePair(mode, pair.fg, pair.bg, WCAG_AA.normalText)).toBeGreaterThanOrEqual(
      WCAG_AA.normalText,
    )
  })
})

describe.each(modes)('%s — 비텍스트 대비 (3:1)', (mode) => {
  it.each(nonTextPairs.map((p) => [`${p.fg} on ${p.bg}`, p] as const))('%s', (_name, pair) => {
    const ratio = tokenContrast(mode, pair.fg, pair.bg)
    expect(ratio, describePair(mode, pair.fg, pair.bg, WCAG_AA.nonText)).toBeGreaterThanOrEqual(
      WCAG_AA.nonText,
    )
  })
})

describe('토큰 구분 가능성', () => {
  it.each(modes)('%s — textMuted가 text보다 흐리지만 배경과는 AA를 지킨다', (mode) => {
    const text = tokenContrast(mode, 'text', 'bg')
    const muted = tokenContrast(mode, 'textMuted', 'bg')
    expect(muted).toBeLessThan(text)
    expect(muted).toBeGreaterThanOrEqual(WCAG_AA.normalText)
  })

  it.each(modes)('%s — borderStrong이 장식용 border보다 확실히 진하다', (mode) => {
    expect(tokenContrast(mode, 'borderStrong', 'surface')).toBeGreaterThan(
      tokenContrast(mode, 'border', 'surface'),
    )
  })
})
