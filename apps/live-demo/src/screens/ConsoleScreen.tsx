import { Text, View } from 'react-native'
import { useT } from '../i18n'
import { createThemedStyles, font, space, useThemedStyles } from '../theme'

/**
 * S13 — Symposia 운영 콘솔(간사·발표자)의 자리.
 * 라우트(`/console`)와 진입만 먼저 뚫어 둔 플레이스홀더다. 내용은 S13 담당이 채운다.
 */
export function ConsoleScreen() {
  const t = useT()
  const styles = useThemedStyles(stylesFor)

  return (
    <View style={styles.wrap}>
      <Text style={styles.badge}>{t('common.comingSoon')}</Text>
      <Text style={styles.body}>{t('console.comingSoon')}</Text>
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[2], padding: space[5] },
  badge: { fontSize: font.md, fontWeight: '700', color: color.primary },
  body: { fontSize: font.sm, color: color.textMuted, textAlign: 'center' },
}))
