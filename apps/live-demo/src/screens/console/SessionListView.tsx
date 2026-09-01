import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import type { SessionSummary } from '@thegame/realtime'
import { fetchSessions } from '../../api/sessions'
import { SessionStateBadge } from '../../components/SessionStateBadge'
import { useT } from '../../i18n'
import { useConsoleStore } from '../../stores/consoleStore'
import { createThemedStyles, font, radius, space, useTheme, useThemedStyles } from '../../theme'
import { CreateSessionForm } from './CreateSessionForm'

/** 목록 자동 갱신 주기. 시청자 수가 늘어나는 게 보여야 "입장했다"를 눈으로 확인한다 */
const LIST_REFETCH_MS = 5000

function SessionRow({ session, onPress }: { session: SessionSummary; onPress: () => void }) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)

  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {session.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {session.speaker} · {session.sourceLang.toUpperCase()} →{' '}
          {session.targetLangs.map((lang) => lang.toUpperCase()).join(', ')}
        </Text>
        <View style={styles.rowStatus}>
          <SessionStateBadge state={session.state} />
          <Text style={styles.rowViewers}>{t('console.viewers', { count: session.viewerCount })}</Text>
          <Text style={styles.rowCode}>
            {t('console.code')} {session.id.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  )
}

/**
 * 콘솔 첫 화면 — "지금 뭐가 돌고 있나"와 "새로 하나 연다" 둘뿐이다.
 * 세션을 고르면 상세(운영)로 넘어간다.
 */
export function SessionListView() {
  const t = useT()
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)
  const open = useConsoleStore((state) => state.open)
  const [creating, setCreating] = useState(false)

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
    retry: 1,
    refetchInterval: LIST_REFETCH_MS,
  })

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text style={styles.subtitle}>{t('console.subtitle')}</Text>
      </View>

      {creating ? (
        <CreateSessionForm
          onCancel={() => setCreating(false)}
          onCreated={(session) => {
            setCreating(false)
            // 만들자마자 상세로 — 다음 동작은 언제나 "코드 보여주고 시작"이다
            open(session)
          }}
        />
      ) : (
        <Pressable
          onPress={() => setCreating(true)}
          accessibilityRole="button"
          style={styles.createButton}
        >
          <Text style={styles.createText}>＋ {t('console.newSession')}</Text>
        </Pressable>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>{t('console.sessions')}</Text>
        <Pressable
          onPress={() => void sessionsQuery.refetch()}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.refresh}>{t('console.refresh')}</Text>
        </Pressable>
      </View>

      {sessionsQuery.isPending && <ActivityIndicator color={color.primary} />}

      {sessionsQuery.isError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{t('console.loadFailed')}</Text>
          <Pressable onPress={() => void sessionsQuery.refetch()} accessibilityRole="button">
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      )}

      {sessionsQuery.data?.length === 0 && <Text style={styles.empty}>{t('console.empty')}</Text>}

      {sessionsQuery.data?.map((session) => (
        <SessionRow key={session.id} session={session} onPress={() => open(session)} />
      ))}
    </ScrollView>
  )
}

const stylesFor = createThemedStyles((color) => ({
  screen: { flex: 1 },
  content: { padding: space[5], gap: space[3] },
  intro: { gap: space[1] },
  subtitle: { fontSize: font.sm, color: color.textMuted },
  createButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.primary,
    backgroundColor: color.primarySubtle,
  },
  createText: { fontSize: font.md, fontWeight: '700', color: color.primary },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[2],
  },
  sectionLabel: { fontSize: font.xs, fontWeight: '700', color: color.textMuted },
  refresh: { fontSize: font.xs, fontWeight: '600', color: color.primary },
  empty: { fontSize: font.sm, color: color.textMuted },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  errorText: { fontSize: font.sm, color: color.danger },
  retryText: { fontSize: font.sm, fontWeight: '600', color: color.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 44,
    padding: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  rowMain: { flex: 1, gap: space[1] },
  rowTitle: { fontSize: font.md, fontWeight: '700', color: color.text },
  rowMeta: { fontSize: font.xs, color: color.textMuted },
  rowStatus: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[2] },
  rowViewers: { fontSize: font.xs, color: color.textMuted },
  rowCode: { fontSize: font.xs, fontWeight: '700', color: color.text, letterSpacing: 1 },
  chevron: { fontSize: font.xl, color: color.textMuted },
}))
