import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native'
import { themeColors, type ThemeColors, type ThemeMode } from './mode'

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle }

export type ThemedStyleSheet<T> = (mode: ThemeMode) => T

/**
 * RN의 StyleSheet는 정적이라 런타임에 색을 바꿀 수 없다.
 * 대신 색을 주입받는 팩토리를 모드별로 **한 번만** 실행해 캐시한다 —
 * 렌더마다 스타일 객체를 새로 만들지 않으므로 FlatList 셀 재사용에도 안전하다.
 */
export function createThemedStyles<T extends NamedStyles<T>>(
  factory: (color: ThemeColors) => T & NamedStyles<T>,
): ThemedStyleSheet<T> {
  const cache: Partial<Record<ThemeMode, T>> = {}
  return (mode) => {
    const cached = cache[mode]
    if (cached !== undefined) return cached
    const created = StyleSheet.create(factory(themeColors(mode)))
    cache[mode] = created
    return created
  }
}
