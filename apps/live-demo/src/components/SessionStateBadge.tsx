import { StyleSheet, Text, View } from 'react-native'
import type { MessageKey } from '@thegame/i18n'
import type { SessionState } from '@thegame/realtime'
import { useT } from '../i18n'
import { font, radius, useTheme, type ThemeColors } from '../theme'
import { badgeLabelColor, badgeTint } from './badgeTone'

const STATE_LABEL: Record<SessionState, MessageKey> = {
  waiting: 'session.waiting',
  playing: 'session.playing',
  paused: 'session.paused',
  ended: 'session.ended',
}

function toneFor(state: SessionState, color: ThemeColors): string {
  switch (state) {
    case 'playing':
      return color.success
    case 'paused':
      return color.warning
    case 'waiting':
      return color.info
    case 'ended':
      return color.textMuted
  }
}

/**
 * 세션 상태 배지. 운영 콘솔의 목록·상세가 같은 배지를 쓴다 — 목록에서 본 "일시정지"와
 * 상세에서 본 "일시정지"가 다른 모양이면 운영석에서 상태를 오독한다.
 * `ConnectionBadge`(연결 상태)와 같은 형태를 일부러 따랐다.
 */
export function SessionStateBadge({ state }: { state: SessionState }) {
  const t = useT()
  const { color } = useTheme()
  const tone = toneFor(state, color)

  return (
    <View style={[styles.badge, { backgroundColor: badgeTint(tone) }]}>
      <View style={[styles.dot, { backgroundColor: tone }]} aria-hidden />
      <Text style={[styles.label, { color: badgeLabelColor(color) }]}>{t(STATE_LABEL[state])}</Text>
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
