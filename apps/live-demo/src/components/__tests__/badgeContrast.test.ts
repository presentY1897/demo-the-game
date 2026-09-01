import { describe, expect, it } from 'vitest'
import { contrastRatio, semanticColor, WCAG_AA, type ThemeMode } from '@thegame/tokens'
import { BADGE_TINT_ALPHA, badgeLabelColor } from '../badgeTone'

/**
 * 상태 배지의 **합성색** 대비 (S06 인계 2).
 *
 * `packages/tokens`의 대비 테스트는 토큰 두 개의 조합만 본다. 배지 배경은 tone을 알파로
 * 합성한 결과라 그 목록에 올릴 수 없고(토큰이 아니다), 그렇다고 검사를 빼면 "토큰은
 * 전부 통과인데 화면은 미달"이 그대로 남는다 — 실제로 그랬다. 그래서 합성을 여기서
 * 재현해 검사한다.
 *
 * 배지가 놓이는 배경은 컴포넌트가 정하지 않는다(툴바=bg, 카드=surface, 서브틀 행) —
 * `contrast.ts`의 규칙 3과 같은 이유로 중립 표면 3종 전부와 짝짓는다.
 */

const BASES = ['bg', 'surface', 'surfaceSubtle'] as const
const MODES: ThemeMode[] = ['light', 'dark']

/** ConnectionBadge / SessionStateBadge가 tone으로 쓰는 토큰 */
const TONE_TOKENS = ['textMuted', 'success', 'warning', 'danger', 'info'] as const

const channels = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]

const toHex = (value: number): string => Math.round(value).toString(16).padStart(2, '0')

/** RN이 `#RRGGBBAA`를 그리는 것과 같은 소스-오버 합성 */
function composite(fg: string, bg: string, alpha: number): string {
  const [fr, fg_, fb] = channels(fg)
  const [br, bg_, bb] = channels(bg)
  const mix = (f: number, b: number): string => toHex(f * alpha + b * (1 - alpha))
  return `#${mix(fr, br)}${mix(fg_, bg_)}${mix(fb, bb)}`
}

const alpha = BADGE_TINT_ALPHA / 255

const cases = MODES.flatMap((mode) =>
  TONE_TOKENS.flatMap((toneToken) =>
    BASES.map((base) => {
      const palette = semanticColor[mode]
      const tone = palette[toneToken]
      const tint = composite(tone, palette[base], alpha)
      return { mode, toneToken, base, tone, tint, label: badgeLabelColor(palette) }
    }),
  ),
)

describe('배지 틴트 위의 대비', () => {
  it('검사 대상은 모드 2 × tone 5 × 표면 3 = 30조합이다', () => {
    expect(cases).toHaveLength(30)
  })

  it.each(cases)(
    '$mode — $toneToken 배지가 $base 위에 있을 때 라벨이 AA를 넘는다',
    ({ tint, label }) => {
      expect(contrastRatio(label, tint)).toBeGreaterThanOrEqual(WCAG_AA.normalText)
    },
  )

  it.each(cases)(
    '$mode — $toneToken 배지가 $base 위에 있을 때 상태 점이 비텍스트 3:1을 넘는다',
    ({ tint, tone }) => {
      expect(contrastRatio(tone, tint)).toBeGreaterThanOrEqual(WCAG_AA.nonText)
    },
  )

  it('라벨 색을 tone으로 되돌리면 검사가 깨진다 — 이 테스트가 지키는 게 그거다', () => {
    const failing = cases.filter(
      ({ tint, tone }) => contrastRatio(tone, tint) < WCAG_AA.normalText,
    )
    expect(failing.length).toBeGreaterThan(0)
  })
})
