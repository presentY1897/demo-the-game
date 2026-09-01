import { Pressable, Text, View } from 'react-native'
import { useT } from '../../i18n'
import type { Route } from '../../navigation'
import { createThemedStyles, font, radius, space, useThemedStyles } from '../../theme'

/**
 * "이어서 돌아가기" 제안. 자동으로 이동하지 않는 게 핵심이다 —
 * 다른 세션을 보러 온 사람을 지난 방으로 끌고 가지 않는다(S03).
 */
interface ResumeBannerProps {
  route: Route
  onResume: () => void
  onDismiss: () => void
}

export function ResumeBanner({ route, onResume, onDismiss }: ResumeBannerProps) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)

  const label =
    route.name === 'symposia'
      ? t('home.resumeSession', { target: route.sessionId })
      : route.name === 'caretalk' && route.inviteCode !== undefined
        ? t('home.resumeRoom', { target: route.inviteCode })
        : null

  if (label === null) return null

  return (
    <View style={styles.banner}>
      <Pressable style={styles.main} onPress={onResume} accessibilityRole="button">
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      <Pressable onPress={onDismiss} accessibilityRole="button" hitSlop={12}>
        <Text style={styles.dismiss}>{t('home.resumeDismiss')}</Text>
      </Pressable>
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.md,
    backgroundColor: color.primarySubtle,
    borderWidth: 1,
    borderColor: color.primary,
  },
  main: { flex: 1, minHeight: 28, justifyContent: 'center' },
  label: { fontSize: font.sm, fontWeight: '700', color: color.primary },
  dismiss: { fontSize: font.xs, color: color.textMuted },
}))
