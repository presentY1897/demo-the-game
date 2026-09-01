import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useI18n } from '../i18n'
import { useNav } from '../navigation'
import { createThemedStyles, font, space, useThemedStyles } from '../theme'

interface ScreenProps {
  title: string
  showBack?: boolean
  headerRight?: ReactNode
  children: ReactNode
}

export function Screen({ title, showBack = false, headerRight, children }: ScreenProps) {
  const back = useNav((state) => state.back)
  const { locale, toggle } = useI18n()
  const styles = useThemedStyles(stylesFor)

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {showBack && (
            <Pressable onPress={back} hitSlop={12} accessibilityRole="button">
              <Text style={styles.backChevron}>‹</Text>
            </Pressable>
          )}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {headerRight}
          <Pressable onPress={toggle} hitSlop={8} accessibilityRole="button" style={styles.locale}>
            <Text style={styles.localeText}>{locale === 'ko' ? 'EN' : '한국어'}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  screen: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
    gap: space[3],
  },
  headerSide: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  backChevron: { fontSize: font['2xl'], color: color.primary, lineHeight: font['2xl'] },
  title: { fontSize: font.lg, fontWeight: '700', color: color.text, flexShrink: 1 },
  locale: { paddingHorizontal: 8, paddingVertical: 2 },
  localeText: { fontSize: font.xs, fontWeight: '600', color: color.textMuted },
  body: { flex: 1 },
}))
