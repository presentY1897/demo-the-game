import { fontSize, radius, semanticColor, spacing } from '@thegame/tokens'

// RN은 CSS 변수가 없으므로 토큰 원값을 직접 소비한다 (ADR-0002)
export const color = semanticColor.light
export const space = spacing
export const font = fontSize
export { radius }
