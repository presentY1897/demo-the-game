import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { API_BASE } from '../config'
import { useT } from '../i18n'
import { useNav } from '../navigation'
import { createThemedStyles, font, radius, space, useTheme, useThemedStyles } from '../theme'

interface SessionSummary {
  id: string
  title: string
  speaker: string
  sourceLang: string
  targetLangs: string[]
}

async function fetchSessions(): Promise<SessionSummary[]> {
  const res = await fetch(`${API_BASE}/api/sessions`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body: unknown = await res.json()
  if (!Array.isArray(body)) throw new Error('Unexpected /api/sessions payload')
  return body as SessionSummary[]
}

export function HomeScreen() {
  const t = useT()
  const navigate = useNav((state) => state.navigate)
  const sessionsQuery = useQuery({ queryKey: ['sessions'], queryFn: fetchSessions, retry: 1 })
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>{t('company.name')}</Text>
      <Text style={styles.mission}>{t('company.mission')}</Text>

      <View style={styles.card}>
        <Text style={styles.productName}>{t('product.symposia.name')}</Text>
        <Text style={styles.tagline}>{t('product.symposia.tagline')}</Text>

        {sessionsQuery.isPending && <ActivityIndicator color={color.primary} />}
        {sessionsQuery.isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{t('common.error')}</Text>
            <Pressable onPress={() => void sessionsQuery.refetch()} accessibilityRole="button">
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        )}
        {sessionsQuery.data?.map((session) => (
          <Pressable
            key={session.id}
            style={styles.sessionRow}
            onPress={() => navigate({ name: 'symposia', sessionId: session.id })}
            accessibilityRole="button"
          >
            <View style={styles.liveDot} />
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionTitle}>{session.title}</Text>
              <Text style={styles.sessionMeta}>
                {session.speaker} · {session.sourceLang.toUpperCase()} →{' '}
                {session.targetLangs.map((lang) => lang.toUpperCase()).join(', ')}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.card}
        onPress={() => navigate({ name: 'caretalk' })}
        accessibilityRole="button"
      >
        <Text style={styles.productName}>{t('product.careTalk.name')}</Text>
        <Text style={styles.tagline}>{t('product.careTalk.tagline')}</Text>
        <Text style={styles.chevronRight}>›</Text>
      </Pressable>
    </ScrollView>
  )
}

const stylesFor = createThemedStyles((color) => ({
  screen: { flex: 1 },
  content: { padding: space[5], gap: space[4] },
  brand: { fontSize: font['2xl'], fontWeight: '800', color: color.primary },
  mission: { fontSize: font.sm, color: color.textMuted, marginBottom: space[2] },
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space[5],
    gap: space[3],
  },
  productName: { fontSize: font.xl, fontWeight: '700', color: color.text },
  tagline: { fontSize: font.sm, color: color.textMuted },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  errorText: { color: color.danger, fontSize: font.sm },
  retryText: { color: color.primary, fontSize: font.sm, fontWeight: '600' },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: color.surfaceSubtle,
    borderRadius: radius.md,
    padding: space[4],
  },
  liveDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.success },
  sessionInfo: { flex: 1, gap: 2 },
  sessionTitle: { fontSize: font.md, fontWeight: '600', color: color.text },
  sessionMeta: { fontSize: font.xs, color: color.textMuted },
  chevron: { fontSize: font.xl, color: color.textMuted },
  chevronRight: {
    position: 'absolute',
    right: space[5],
    top: '50%',
    fontSize: font.xl,
    color: color.textMuted,
  },
}))
