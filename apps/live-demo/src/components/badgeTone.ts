import type { ThemeColors } from '../theme'

/**
 * 상태 배지의 색 규칙 (S06 인계 2).
 *
 * 배지는 `tone`(success/warning/danger/info/중립)을 알파로 합성한 배경 위에 글자를 얹는다.
 * 합성색은 **토큰 두 개의 조합이 아니라 컴포넌트가 고른 알파의 결과**라 `packages/tokens`의
 * 대비 테스트가 다루지 못한다 — 그래서 규칙을 여기 한 곳에 모으고
 * `__tests__/badgeContrast.test.ts`가 실제 합성색의 대비를 계산해 검사한다.
 *
 * 원래는 12% 틴트 위에 **같은 tone**으로 글자를 썼다. 그 조합은 라이트 3.79~4.36,
 * 다크 4.12~4.35로 30조합 중 15개가 AA(4.5:1) 미달이었다. 틴트를 낮춰도 소용이 없다 —
 * 알파가 0일 때의 상한이 토큰 대비(최악 4.57)라 여유가 거의 없기 때문이다.
 *
 * 그래서 **라벨 색을 tone에서 떼어냈다**: 글자는 `text`, 상태 색은 틴트와 점이 나른다.
 * 라벨이 tone에서 자유로워지자 틴트를 12% → 20%로 올려 배지가 더 또렷해졌고,
 * 그래도 점(비텍스트 3:1)은 최악 3.36:1로 여유가 남는다.
 */
export const BADGE_TINT_ALPHA = 0x33

/** `#RRGGBB` + 알파 → RN이 받는 `#RRGGBBAA` */
export function badgeTint(tone: string): string {
  return `${tone}${BADGE_TINT_ALPHA.toString(16).toUpperCase()}`
}

/** 배지 라벨 색 — tone이 아니라 본문 색이다 (위 doc comment 참고) */
export function badgeLabelColor(color: ThemeColors): string {
  return color.text
}
