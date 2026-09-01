import { useCallback, useRef, useState } from 'react'
import { FlatList, Pressable, Text, View, type ListRenderItemInfo } from 'react-native'
import { CaptionRow } from '../../components/CaptionRow'
import { ConnectionBadge } from '../../components/ConnectionBadge'
import { LiveCaptionLine } from '../../components/LiveCaptionLine'
import { useCaptionStream } from '../../hooks/useCaptionStream'
import { useT } from '../../i18n'
import { useCaptionStore, type CaptionEntry } from '../../stores/captionStore'
import { createThemedStyles, font, radius, space, useThemedStyles } from '../../theme'

/** 모니터는 운영 화면의 한 칸이라 높이를 고정하고 안에서만 스크롤한다 */
const MONITOR_HEIGHT = 220
/** 상세 화면에는 제어·QR도 함께 있어 자막은 참가자 화면보다 조금 작게 */
const MONITOR_SCALE = 0.9

interface CaptionMonitorProps {
  sessionId: string
  targetLangs: string[]
}

/**
 * 자막 모니터 — 참가자와 **같은 SSE 스트림**(`/stream?lang=xx`)을 그대로 구독한다.
 * 별도 미리보기 경로를 만들지 않았기 때문에 "모니터에는 나오는데 참가자에게는 안 나온다"가
 * 구조적으로 불가능하다(S13 완성 기준 4). 줄 렌더도 참가자와 같은 `CaptionRow`다.
 *
 * 대가 하나: 이 구독도 서버의 `viewerCount`에 1로 잡힌다 — 상세 화면이 그 사실을 안내한다.
 */
export function CaptionMonitor({ sessionId, targetLangs }: CaptionMonitorProps) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)
  const [lang, setLang] = useState(targetLangs[0] ?? 'en')
  const listRef = useRef<FlatList<CaptionEntry>>(null)

  useCaptionStream(sessionId, lang)
  const entries = useCaptionStore((state) => state.entries)
  const status = useCaptionStore((state) => state.status)
  // 부분 자막 내용이 아니라 **있는지 여부**만 구독한다 — 단어마다 모니터가 리렌더되지
  // 않으면서도 "대기 중" 안내를 제때 치울 수 있다 (docs/perf/001)
  const hasPartial = useCaptionStore((state) => state.partial !== null)

  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<CaptionEntry>) => (
      <CaptionRow entry={item} targetLang={lang} scale={MONITOR_SCALE} />
    ),
    [lang],
  )

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.langChips}>
          {targetLangs.map((code) => (
            <Pressable
              key={code}
              onPress={() => setLang(code)}
              accessibilityRole="button"
              accessibilityLabel={t('console.monitor.language')}
              accessibilityState={{ selected: lang === code }}
              style={[styles.chip, lang === code && styles.chipActive]}
            >
              <Text style={[styles.chipText, lang === code && styles.chipTextActive]}>
                {code.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
        <ConnectionBadge status={status} />
      </View>

      <View style={styles.viewport}>
        {entries.length === 0 && !hasPartial ? (
          <Text style={styles.waiting}>{t('console.monitor.waiting')}</Text>
        ) : (
          <>
            <FlatList
              ref={listRef}
              style={styles.list}
              data={entries}
              keyExtractor={(entry) => entry.id}
              renderItem={renderRow}
              contentContainerStyle={styles.listContent}
              // 모니터는 "지금 나가는 자막"이 일이라 언제나 최신에 붙어 있는다
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            />
            <LiveCaptionLine targetLang={lang} scale={MONITOR_SCALE} compact />
          </>
        )}
      </View>
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  wrap: { gap: space[2] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space[2],
  },
  langChips: { flexDirection: 'row', gap: space[2] },
  chip: {
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSubtle,
  },
  chipActive: { backgroundColor: color.primary },
  chipText: { fontSize: font.xs, fontWeight: '600', color: color.textMuted },
  chipTextActive: { color: color.onPrimary },
  viewport: {
    height: MONITOR_HEIGHT,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.bg,
    padding: space[3],
  },
  list: { flex: 1 },
  listContent: { gap: space[3] },
  waiting: { fontSize: font.sm, color: color.textMuted },
}))
