import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { createRoom, findRoomByCode } from '../../api/rooms'
import { ActionButton } from '../../components/ActionButton'
import { useT } from '../../i18n'
import { useNav } from '../../navigation'
import { useConversationStore } from '../../stores/conversationStore'
import { createThemedStyles, font, space, useTheme, useThemedStyles } from '../../theme'

/**
 * 의료진이 방을 얻는 단계.
 *
 * 주소에 코드가 있으면(새로고침·북마크) **그 방으로 돌아간다** — 새로고침 한 번에
 * 환자에게 보여주던 코드가 바뀌면 진료실에서 사고다. 코드가 없을 때만 새로 만든다.
 */
export function StaffCreateStep({ lang, inviteCode }: { lang: string; inviteCode?: string }) {
  const t = useT()
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  const enter = useCallback(
    async (mode: 'resume' | 'create') => {
      setBusy(true)
      setFailure(null)
      const result =
        mode === 'resume' && inviteCode !== undefined
          ? await findRoomByCode(inviteCode)
          : await createRoom()
      setBusy(false)
      if (!result.ok) {
        setFailure(
          result.error.code === 'not-found'
            ? t('room.notFound')
            : `${result.error.code}: ${result.error.message}`,
        )
        return
      }
      useConversationStore.getState().enterRoom({ ...result.value, role: 'staff', lang })
      // 주소창을 방 URL로 맞춘다. push가 아니라 replace인 이유: 뒤로가기가 방 생성
      // 직전 화면으로 돌아가 또 방을 만드는 걸 막기 위해.
      useNav.getState().replace({ name: 'caretalk', inviteCode: result.value.inviteCode })
    },
    [inviteCode, lang, t],
  )

  useEffect(() => {
    if (started.current) return
    started.current = true
    void enter(inviteCode === undefined ? 'create' : 'resume')
  }, [enter, inviteCode])

  if (failure !== null) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.error}>{t('room.createFailed')}</Text>
        <Text style={styles.detail}>{failure}</Text>
        <ActionButton
          label={t('common.retry')}
          onPress={() => void enter(inviteCode === undefined ? 'create' : 'resume')}
          disabled={busy}
        />
        {inviteCode !== undefined && (
          <ActionButton
            label={t('home.startConversation')}
            variant="secondary"
            onPress={() => void enter('create')}
            disabled={busy}
          />
        )}
      </View>
    )
  }

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={color.primary} />
      <Text style={styles.detail}>{t('room.creating')}</Text>
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[5] },
  error: { fontSize: font.md, fontWeight: '700', color: color.danger },
  detail: { fontSize: font.sm, color: color.textMuted, textAlign: 'center' },
}))
