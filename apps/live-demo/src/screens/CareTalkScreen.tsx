import { useEffect, useState } from 'react'
import { View } from 'react-native'
import type { ParticipantRole } from '@thegame/realtime'
import { useConversation } from '../hooks/useConversation'
import { useConversationStore } from '../stores/conversationStore'
import { DEFAULT_LANG_FOR, useOnboarding } from '../stores/onboardingStore'
import { loadLastVisit } from '../storage/lastVisit'
import { platformStorage } from '../storage/platform'
import { createThemedStyles, useThemedStyles } from '../theme'
import { ConversationView } from './caretalk/ConversationView'
import { LanguageStep } from './caretalk/LanguageStep'
import { PatientJoinStep } from './caretalk/PatientJoinStep'
import { RoleStep } from './caretalk/RoleStep'
import { StaffCreateStep } from './caretalk/StaffCreateStep'
import { StaffWaiting } from './caretalk/StaffWaiting'

/**
 * 방 안. 소켓은 여기서 한 번만 열고, 화면만 대기 ↔ 대화로 갈아탄다 —
 * 의료진이 환자 입장(`joined`)을 받으려면 대기 중에도 연결돼 있어야 한다.
 */
function CareTalkRoom({
  roomId,
  inviteCode,
  role,
  lang,
}: {
  roomId: string
  inviteCode: string
  role: ParticipantRole
  lang: string
}) {
  const { say, notifyTyping } = useConversation(roomId, role, lang)
  const peerJoined = useConversationStore((state) => state.peerJoined)
  const [opened, setOpened] = useState(false)

  if (role === 'staff' && !peerJoined && !opened) {
    return <StaffWaiting inviteCode={inviteCode} onOpenConversation={() => setOpened(true)} />
  }
  return <ConversationView myRole={role} myLang={lang} say={say} notifyTyping={notifyTyping} />
}

/**
 * CareTalk 진입 흐름. 단계는 상태에서 파생된다:
 * 역할 → 언어(온보딩 1스텝) → 방(의료진은 생성, 환자는 코드 해석) → 대화.
 */
export function CareTalkScreen({ inviteCode }: { inviteCode?: string }) {
  const styles = useThemedStyles(stylesFor)
  const role = useOnboarding((state) => state.role)
  const lang = useOnboarding((state) => state.lang)
  const confirmed = useOnboarding((state) => state.confirmed)
  const roomId = useConversationStore((state) => state.roomId)
  const joinedCode = useConversationStore((state) => state.inviteCode)
  const myRole = useConversationStore((state) => state.myRole)
  const myLang = useConversationStore((state) => state.myLang)

  // 초대 링크로 바로 들어온 경우 역할을 정한다. 기본은 환자다 — 초대 링크는
  // 환자에게 건네는 것이므로(S03). 단, 같은 방을 보던 기기라면 그때의 역할을
  // 되살린다: 의료진이 새로고침했다고 환자로 바뀌면 안 된다.
  useEffect(() => {
    if (role !== null || inviteCode === undefined) return
    const saved = loadLastVisit(platformStorage())
    const sameRoom =
      saved !== null && saved.route.name === 'caretalk' && saved.route.inviteCode === inviteCode
    const onboarding = useOnboarding.getState()
    if (sameRoom && saved.role !== null && saved.lang !== null) {
      onboarding.restore(saved.role, saved.lang)
      return
    }
    onboarding.setRole('patient')
  }, [role, inviteCode])

  // 화면을 벗어나면 방을 놓는다 — 다음 진입이 남은 대화 위에 얹히지 않게
  useEffect(() => () => useConversationStore.getState().reset(), [])

  const body = (): React.ReactNode => {
    if (roomId !== null && joinedCode !== null && myRole !== null && myLang !== null) {
      return (
        <CareTalkRoom roomId={roomId} inviteCode={joinedCode} role={myRole} lang={myLang} />
      )
    }
    if (role === null) {
      return <RoleStep onPick={(picked) => useOnboarding.getState().setRole(picked)} />
    }
    if (!confirmed || lang === null) {
      return (
        <LanguageStep
          role={role}
          selected={lang ?? DEFAULT_LANG_FOR[role]}
          onSelect={(picked) => useOnboarding.getState().setLang(picked)}
          onContinue={() => useOnboarding.getState().confirm()}
        />
      )
    }
    return role === 'staff' ? (
      <StaffCreateStep lang={lang} {...(inviteCode === undefined ? {} : { inviteCode })} />
    ) : (
      <PatientJoinStep lang={lang} initialCode={inviteCode ?? ''} />
    )
  }

  return <View style={styles.screen}>{body()}</View>
}

const stylesFor = createThemedStyles(() => ({
  screen: { flex: 1 },
}))
