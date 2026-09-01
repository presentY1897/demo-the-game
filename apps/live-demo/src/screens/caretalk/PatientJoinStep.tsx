import { useCallback, useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { findRoomByCode } from '../../api/rooms'
import { CodeField } from '../../components/CodeField'
import { useT } from '../../i18n'
import { useNav } from '../../navigation'
import { normalizeInviteCode } from '../../routing/url'
import { useConversationStore } from '../../stores/conversationStore'
import { createThemedStyles, font, space, useThemedStyles } from '../../theme'

/**
 * 환자의 코드 입장. QR·링크로 들어온 경우 코드가 이미 채워져 있어 자동으로
 * 한 번 해석한다 — 실패하면 코드를 남긴 채 인라인 에러를 띄우고 다시 시도하게 한다.
 */
export function PatientJoinStep({ lang, initialCode }: { lang: string; initialCode: string }) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)
  const [code, setCode] = useState(initialCode)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const autoTried = useRef(false)

  const join = useCallback(
    async (raw: string) => {
      const normalized = normalizeInviteCode(raw)
      if (normalized === '') {
        setError(t('room.codeEmpty'))
        return
      }
      setBusy(true)
      setError(null)
      const result = await findRoomByCode(normalized)
      setBusy(false)
      if (!result.ok) {
        // 없는 코드는 사용자가 고칠 수 있는 실패다 — 서버 문구 대신 행동을 알려준다
        setError(
          result.error.code === 'not-found'
            ? t('room.notFound')
            : `${t('common.error')} (${result.error.code})`,
        )
        return
      }
      useConversationStore.getState().enterRoom({ ...result.value, role: 'patient', lang })
      useNav.getState().replace({ name: 'caretalk', inviteCode: result.value.inviteCode })
    },
    [lang, t],
  )

  useEffect(() => {
    if (autoTried.current) return
    if (initialCode === '') return
    autoTried.current = true
    void join(initialCode)
  }, [initialCode, join])

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('room.codeTitle')}</Text>
      <CodeField
        value={code}
        onChangeText={(next) => setCode(next.toUpperCase())}
        onSubmit={() => void join(code)}
        placeholder={t('room.codePlaceholder')}
        submitLabel={busy ? t('room.joining') : t('room.join')}
        accessibilityLabel={t('room.inviteCode')}
        autoCapitalize="characters"
        busy={busy}
        error={error}
      />
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  wrap: { padding: space[5], gap: space[3] },
  title: { fontSize: font.lg, fontWeight: '700', color: color.text },
}))
