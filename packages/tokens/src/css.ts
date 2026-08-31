import { semanticColor, type ThemeMode } from './color'
import { fontFamily, fontSize, fontWeight, lineHeight } from './typography'
import { radius, shadow, spacing } from './spacing'

const toKebab = (key: string): string =>
  key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

function vars(prefix: string, entries: Record<string | number, string | number>, unit = ''): string[] {
  return Object.entries(entries).map(
    ([key, value]) => `--tg-${prefix}-${toKebab(String(key))}: ${value}${typeof value === 'number' && value !== 0 ? unit : ''};`,
  )
}

function colorVars(mode: ThemeMode): string[] {
  return vars('color', semanticColor[mode])
}

const baseVars: string[] = [
  ...vars('font-size', fontSize, 'px'),
  ...vars('font-weight', fontWeight),
  ...vars('leading', lineHeight),
  ...vars('space', spacing, 'px'),
  ...vars('radius', radius, 'px'),
  ...vars('shadow', shadow),
  `--tg-font-sans: ${fontFamily.sans};`,
  `--tg-font-mono: ${fontFamily.mono};`,
]

/**
 * 라이트 팔레트를 :root에, 다크 팔레트를 [data-theme='dark'] 오버라이드로 내보낸다.
 * 앱은 이 문자열을 전역 <style> 한 번으로 주입하면 된다.
 */
export function themeCss(): string {
  return [
    `:root {\n  ${[...colorVars('light'), ...baseVars].join('\n  ')}\n}`,
    `[data-theme='dark'] {\n  ${colorVars('dark').join('\n  ')}\n}`,
  ].join('\n')
}

/** 단일 모드의 CSS 변수 블록 내용만 필요할 때 (예: 스코프 테마) */
export function cssVariables(mode: ThemeMode): string {
  return [...colorVars(mode), ...baseVars].join('\n')
}
