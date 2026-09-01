import { StyleSheet, Text, View } from 'react-native'
import type { ConnectionStatus } from '@thegame/realtime'
import { useT } from '../i18n'
import { font, radius, useTheme, type ThemeColors } from '../theme'
import { badgeLabelColor, badgeTint } from './badgeTone'

const toneFor = (status: ConnectionStatus, color: ThemeColors): string => {
  switch (status.state) {
    case 'open':
      return color.success
    case 'connecting':
    case 'reconnecting':
      return color.warning
    case 'closed':
      return color.danger
    case 'idle':
      return color.textMuted
  }
}

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const t = useT()
  const { color } = useTheme()
  const tone = toneFor(status, color)
  const label =
    status.state === 'reconnecting'
      ? t('connection.reconnecting', { attempt: status.attempt })
      : t(`connection.${status.state}`)

  return (
    <View style={[styles.badge, { backgroundColor: badgeTint(tone) }]}>
      {/* 점은 상태를 색으로 되풀이할 뿐이라 스크린리더에는 내지 않는다 */}
      <View style={[styles.dot, { backgroundColor: tone }]} aria-hidden />
      <Text style={[styles.label, { color: badgeLabelColor(color) }]}>{label}</Text>
    </View>
  )
}

// 배치·크기는 테마와 무관하므로 시트는 정적으로 두고, 색만 인라인으로 준다
const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: radius.full },
  label: { fontSize: font.xs, fontWeight: '600' },
})
