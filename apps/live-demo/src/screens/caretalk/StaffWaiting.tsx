import { ScrollView, Text, View } from 'react-native'
import { ActionButton } from '../../components/ActionButton'
import { ConnectionBadge } from '../../components/ConnectionBadge'
import { QrCode } from '../../components/QrCode'
import { APP_ORIGIN } from '../../config'
import { useT } from '../../i18n'
import { routeToUrl } from '../../routing/url'
import { useConversationStore } from '../../stores/conversationStore'
import { createThemedStyles, font, radius, space, useThemedStyles } from '../../theme'

/**
 * 환자 입장 대기 화면. 코드는 받아 적기 위한 것이고 QR은 환자 폰으로 바로
 * 넘기기 위한 것이다 — 진료실에서 둘 다 쓰인다(F02).
 * 환자가 들어오면(`joined` 브로드캐스트, 또는 첫 발화) 이 화면은 대화로 넘어간다.
 * 새로고침으로 그 신호를 놓쳤을 수 있으므로 직접 넘어가는 출구도 함께 둔다 —
 * 프로토콜에 "지금 방에 누가 있나" 질의가 없어 대기 화면에 갇히지 않게 하는 장치다.
 */
export function StaffWaiting({
  inviteCode,
  onOpenConversation,
}: {
  inviteCode: string
  onOpenConversation: () => void
}) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)
  const status = useConversationStore((state) => state.status)
  const url = routeToUrl(APP_ORIGIN, { name: 'caretalk', inviteCode })

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('room.waitingTitle')}</Text>
        <ConnectionBadge status={status} />
      </View>
      <Text style={styles.hint}>{t('room.waitingHint')}</Text>

      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>{t('room.inviteCode')}</Text>
        <Text style={styles.code} accessibilityLabel={inviteCode.split('').join(' ')}>
          {inviteCode}
        </Text>
      </View>

      <QrCode value={url} />
      <Text style={styles.linkLabel}>{t('room.linkHint')}</Text>
      <Text style={styles.link} selectable>
        {url}
      </Text>

      <ActionButton
        label={t('room.openConversation')}
        variant="secondary"
        onPress={onOpenConversation}
      />
    </ScrollView>
  )
}

const stylesFor = createThemedStyles((color) => ({
  screen: { flex: 1 },
  wrap: { padding: space[5], gap: space[3] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  title: { fontSize: font.lg, fontWeight: '700', color: color.text, flexShrink: 1 },
  hint: { fontSize: font.sm, color: color.textMuted },
  codeBox: {
    alignItems: 'center',
    gap: space[1],
    paddingVertical: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surfaceSubtle,
  },
  codeLabel: { fontSize: font.xs, color: color.textMuted },
  code: { fontSize: font['3xl'], fontWeight: '800', letterSpacing: 6, color: color.primary },
  linkLabel: { fontSize: font.xs, color: color.textMuted, textAlign: 'center' },
  link: { fontSize: font.xs, color: color.textMuted, textAlign: 'center' },
}))
