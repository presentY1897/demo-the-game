import { Text, View } from 'react-native'
import type { ParticipantRole } from '@thegame/realtime'
import { ActionButton } from '../../components/ActionButton'
import { useT } from '../../i18n'
import { createThemedStyles, font, space, useThemedStyles } from '../../theme'

/**
 * 역할 선택은 원래 홈의 진입 버튼이 대신한다(S02). 이 화면은 `/room`으로 직접
 * 들어와 역할을 알 수 없을 때만 나오는 되돌아가기 없는 갈림길이다.
 */
export function RoleStep({ onPick }: { onPick: (role: ParticipantRole) => void }) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('onboarding.roleTitle')}</Text>
      <ActionButton
        label={t('home.startConversation')}
        hint={t('home.startConversationHint')}
        onPress={() => onPick('staff')}
      />
      <ActionButton
        label={t('home.joinWithCode')}
        hint={t('home.joinWithCodeHint')}
        variant="secondary"
        onPress={() => onPick('patient')}
      />
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  wrap: { padding: space[5], gap: space[3] },
  title: { fontSize: font.lg, fontWeight: '700', color: color.text, marginBottom: space[1] },
}))
