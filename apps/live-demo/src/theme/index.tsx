import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import { fontSize, radius, spacing } from '@thegame/tokens'
import { useStageMode } from '../stores/stageStore'
import {
  resolveThemeMode,
  themeColors,
  type ThemeColors,
  type ThemeMode,
} from './mode'

// RN은 CSS 변수가 없으므로 토큰 원값을 직접 소비한다 (ADR-0002)
export const space = spacing
export const font = fontSize
export { radius }

export {
  resolveThemeMode,
  statusBarStyle,
  systemThemeMode,
  themeColors,
  type ColorSchemeName,
  type ThemeColors,
  type ThemeMode,
  type ThemeModeInput,
} from './mode'
export { createThemedStyles, type ThemedStyleSheet } from './styles'

export interface Theme {
  mode: ThemeMode
  color: ThemeColors
}

const fallbackTheme: Theme = { mode: 'light', color: themeColors('light') }

const ThemeContext = createContext<Theme>(fallbackTheme)

/**
 * 테마 단일 진입점. 시스템 다크 설정을 기본으로 따르되
 * 스테이지 모드가 켜져 있으면 강제로 다크가 된다.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme()
  const stageMode = useStageMode((state) => state.enabled)
  const mode = resolveThemeMode({ scheme, stageMode })
  const theme = useMemo<Theme>(() => ({ mode, color: themeColors(mode) }), [mode])

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  return useContext(ThemeContext)
}

/** `createThemedStyles`로 만든 시트를 현재 모드로 해석한다 */
export function useThemedStyles<T>(sheet: (mode: ThemeMode) => T): T {
  const { mode } = useTheme()
  return sheet(mode)
}
