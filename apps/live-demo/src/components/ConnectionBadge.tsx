import { StyleSheet, Text, View } from 'react-native'
import type { ConnectionStatus } from '@thegame/realtime'
import { useT } from '../i18n'
import { color, font, radius } from '../theme'

const toneFor = (status: ConnectionStatus): string => {
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
  const tone = toneFor(status)
  const label =
    status.state === 'reconnecting'
      ? t('connection.reconnecting', { attempt: status.attempt })
      : t(`connection.${status.state}`)

  return (
    <View style={[styles.badge, { backgroundColor: `${tone}1F` }]}>
      <View style={[styles.dot, { backgroundColor: tone }]} />
      <Text style={[styles.label, { color: tone }]}>{label}</Text>
    </View>
  )
}

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
