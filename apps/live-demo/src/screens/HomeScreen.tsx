import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import type { MessageKey } from '@thegame/i18n'
import type { SessionState, SessionSummary } from '@thegame/realtime'
import { fetchSessions } from '../api/sessions'
import { ActionButton } from '../components/ActionButton'
import { CodeField } from '../components/CodeField'
import { useT } from '../i18n'
import { useNav, type Route } from '../navigation'
import { resolveSessionCode } from '../session/code'
import { useOnboarding } from '../stores/onboardingStore'
import { clearLastVisit, loadLastVisit } from '../storage/lastVisit'
import { platformStorage } from '../storage/platform'
import {
  createThemedStyles,
  font,
  radius,
  space,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '../theme'
import { InfoSheet } from './home/InfoSheet'
import { ResumeBanner } from './home/ResumeBanner'

/** S06 기준 3: 최소 터치 타깃 */
const TOUCH_TARGET = 44

const SESSION_STATE_LABEL: Record<SessionState, MessageKey> = {
  waiting: 'session.waiting',
  playing: 'session.playing',
  paused: 'session.paused',
  ended: 'session.ended',
}

function sessionStateColor(state: SessionState, color: ThemeColors): string {
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

function SessionRow({ session, onPress }: { session: SessionSummary; onPress: () => void }) {
  const t = useT()
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)
  const tone = sessionStateColor(session.state, color)

  return (
    <Pressable style={styles.sessionRow} onPress={onPress} accessibilityRole="button">
      <View style={[styles.stateDot, { backgroundColor: tone }]} aria-hidden />
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle}>{session.title}</Text>
        <Text style={styles.sessionMeta}>
          {session.speaker} · {session.sourceLang.toUpperCase()} →{' '}
          {session.targetLangs.map((lang) => lang.toUpperCase()).join(', ')}
        </Text>
        <Text style={[styles.sessionState, { color: tone }]}>
          {t(SESSION_STATE_LABEL[session.state])}
          {session.state === 'playing' && ` · ${t('home.viewers', { count: session.viewerCount })}`}
        </Text>
      </View>
      <Text style={styles.chevron} aria-hidden>
        ›
      </Text>
    </Pressable>
  )
}

/**
 * 첫 화면은 "무엇을 하러 왔는가"만 묻는다 — 학회 참석자는 세션으로,
 * 의료진·환자는 상담방으로. 회사 소개는 정보 시트로 옮겼다(S02).
 */
export function HomeScreen() {
  const t = useT()
  const navigate = useNav((state) => state.navigate)
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)

  const sessionsQuery = useQuery({ queryKey: ['sessions'], queryFn: fetchSessions, retry: 1 })
  const [sessionCode, setSessionCode] = useState('')
  const [sessionCodeError, setSessionCodeError] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  // 마운트 시 한 번만 읽는다 — 홈으로 돌아올 때마다 컴포넌트가 새로 뜬다
  const [resume, setResume] = useState<Route | null>(() => loadLastVisit(platformStorage())?.route ?? null)

  const enterByCode = () => {
    const result = resolveSessionCode(sessionCode, sessionsQuery.data ?? [])
    if (!result.ok) {
      setSessionCodeError(
        result.reason === 'empty' ? t('home.sessionCodeEmpty') : t('home.sessionCodeUnknown'),
      )
      return
    }
    setSessionCodeError(null)
    navigate({ name: 'symposia', sessionId: result.sessionId })
  }

  const enterCareTalk = (role: 'staff' | 'patient') => {
    useOnboarding.getState().setRole(role)
    navigate({ name: 'caretalk' })
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {resume !== null && (
        <ResumeBanner
          route={resume}
          onResume={() => navigate(resume)}
          onDismiss={() => {
            clearLastVisit(platformStorage())
            setResume(null)
          }}
        />
      )}

      <View style={styles.card}>
        <Text style={styles.productName}>{t('product.symposia.name')}</Text>
        <Text style={styles.sectionLabel}>{t('home.joinSession')}</Text>
        <CodeField
          value={sessionCode}
          onChangeText={setSessionCode}
          onSubmit={enterByCode}
          placeholder={t('home.sessionCodePlaceholder')}
          submitLabel={t('home.enter')}
          accessibilityLabel={t('home.joinSession')}
          error={sessionCodeError}
        />

        <Text style={styles.sectionLabel}>{t('home.liveSessions')}</Text>
        {sessionsQuery.isPending && <ActivityIndicator color={color.primary} />}
        {sessionsQuery.isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{t('common.error')}</Text>
            <Pressable
              onPress={() => void sessionsQuery.refetch()}
              accessibilityRole="button"
              style={styles.retry}
            >
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        )}
        {sessionsQuery.data?.length === 0 && <Text style={styles.empty}>{t('home.noSessions')}</Text>}
        {sessionsQuery.data?.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            onPress={() => navigate({ name: 'symposia', sessionId: session.id })}
          />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.productName}>{t('product.careTalk.name')}</Text>
        <ActionButton
          label={t('home.startConversation')}
          hint={t('home.startConversationHint')}
          onPress={() => enterCareTalk('staff')}
        />
        <ActionButton
          label={t('home.joinWithCode')}
          hint={t('home.joinWithCodeHint')}
          variant="secondary"
          onPress={() => enterCareTalk('patient')}
        />
      </View>

      <Pressable onPress={() => setInfoOpen(true)} accessibilityRole="button" style={styles.infoLink}>
        <Text style={styles.infoText}>{t('home.info')}</Text>
      </Pressable>

      <InfoSheet visible={infoOpen} onClose={() => setInfoOpen(false)} />
    </ScrollView>
  )
}

const stylesFor = createThemedStyles((color) => ({
  screen: { flex: 1 },
  content: { padding: space[5], gap: space[4] },
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space[5],
    gap: space[3],
  },
  productName: { fontSize: font.xl, fontWeight: '700', color: color.text },
  sectionLabel: { fontSize: font.xs, fontWeight: '700', color: color.textMuted, marginTop: space[1] },
  empty: { fontSize: font.sm, color: color.textMuted },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  errorText: { color: color.danger, fontSize: font.sm },
  retry: { minHeight: TOUCH_TARGET, justifyContent: 'center' },
  retryText: { color: color.primary, fontSize: font.sm, fontWeight: '600' },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: color.surfaceSubtle,
    borderRadius: radius.md,
    padding: space[4],
    minHeight: TOUCH_TARGET,
  },
  stateDot: { width: 8, height: 8, borderRadius: radius.full },
  sessionInfo: { flex: 1, gap: 2 },
  sessionTitle: { fontSize: font.md, fontWeight: '600', color: color.text },
  sessionMeta: { fontSize: font.xs, color: color.textMuted },
  sessionState: { fontSize: font.xs, fontWeight: '700' },
  chevron: { fontSize: font.xl, color: color.textMuted },
  infoLink: {
    alignSelf: 'center',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: space[4],
  },
  infoText: { fontSize: font.sm, color: color.textMuted, textDecorationLine: 'underline' },
}))
