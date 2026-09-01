import { semanticColor, type SemanticColorName, type ThemeMode } from '@thegame/tokens'

export type { ThemeMode }

/**
 * 토큰의 light/dark 세트는 같은 키를 갖는 형제 팔레트다.
 * 값 리터럴이 아니라 이름으로만 소비하도록 넓힌 타입.
 */
export type ThemeColors = Record<SemanticColorName, string>

/**
 * RN의 useColorScheme()이 주는 값. 'unspecified'/null/undefined는
 * "OS 설정을 못 읽었다"는 뜻이라 라이트로 떨어진다.
 */
export type ColorSchemeName = 'light' | 'dark' | 'unspecified' | null | undefined

export interface ThemeModeInput {
  /** OS 다크 설정 */
  scheme: ColorSchemeName
  /** 스테이지 모드(어두운 강연장 시청) 활성 여부 */
  stageMode: boolean
}

export function systemThemeMode(scheme: ColorSchemeName): ThemeMode {
  return scheme === 'dark' ? 'dark' : 'light'
}

/**
 * 앱이 실제로 그릴 테마를 결정한다.
 * 스테이지 모드는 "어두운 강연장"이라는 물리적 맥락 전용이라
 * 시스템 라이트 설정보다 우선한다(강제 다크).
 */
export function resolveThemeMode({ scheme, stageMode }: ThemeModeInput): ThemeMode {
  if (stageMode) return 'dark'
  return systemThemeMode(scheme)
}

export function themeColors(mode: ThemeMode): ThemeColors {
  return semanticColor[mode]
}

/** expo-status-bar의 style — 다크 배경 위에는 밝은 글자 */
export function statusBarStyle(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'dark' ? 'light' : 'dark'
}
