import { useRef, useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { useCaptionStream } from '../hooks/useCaptionStream'
import { useT } from '../i18n'
import { useCaptionStore, type CaptionEntry } from '../stores/captionStore'
import { createThemedStyles, font, radius, space, useThemedStyles } from '../theme'

const FONT_SCALE_MIN = 0.85
const FONT_SCALE_MAX = 1.6
const FONT_SCALE_STEP = 0.15

function CaptionRow({
  entry,
  targetLang,
  scale,
}: {
  entry: CaptionEntry
  targetLang: string
  scale: number
}) {
  const styles = useThemedStyles(stylesFor)
  const translation = entry.translations[targetLang]
  return (
    <View style={styles.captionRow}>
      <Text
        style={[
          styles.sourceText,
          { fontSize: font.md * scale },
          !entry.isFinal && styles.partialText,
        ]}
      >
        {entry.sourceText}
        {!entry.isFinal && ' ▌'}
      </Text>
      {entry.isFinal && (
        <Text style={[styles.translationText, { fontSize: font.md * scale }]}>
          {translation ?? '…'}
        </Text>
      )}
    </View>
  )
}

export function SymposiaScreen({ sessionId }: { sessionId: string }) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)
  const [lang, setLang] = useState('en')
  const [scale, setScale] = useState(1)
  const [autoScroll, setAutoScroll] = useState(true)
  const [retryToken, setRetryToken] = useState(0)
  const listRef = useRef<FlatList<CaptionEntry>>(null)

  useCaptionStream(sessionId, lang, retryToken)
  const status = useCaptionStore((state) => state.status)
  const session = useCaptionStore((state) => state.session)
  const entries = useCaptionStore((state) => state.entries)
  const ended = useCaptionStore((state) => state.ended)

  const languages = session?.targetLangs ?? ['en', 'ja', 'zh']
  const closed = status.state === 'closed'

  const resumeAutoScroll = () => {
    setAutoScroll(true)
    listRef.current?.scrollToEnd({ animated: true })
  }

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {session?.title ?? t('common.loading')}
          </Text>
          {session && <Text style={styles.speaker}>{session.speaker}</Text>}
        </View>
        <ConnectionBadge status={status} />
      </View>

      <View style={styles.controls}>
        <View style={styles.langChips}>
          {languages.map((code) => (
            <Pressable
              key={code}
              onPress={() => setLang(code)}
              accessibilityRole="button"
              style={[styles.chip, lang === code && styles.chipActive]}
            >
              <Text style={[styles.chipText, lang === code && styles.chipTextActive]}>
                {code.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.fontControls}>
          <Pressable
            onPress={() => setScale((value) => Math.max(FONT_SCALE_MIN, value - FONT_SCALE_STEP))}
            accessibilityRole="button"
            accessibilityLabel={t('caption.fontSize')}
            style={styles.fontButton}
          >
            <Text style={styles.fontButtonText}>A−</Text>
          </Pressable>
          <Pressable
            onPress={() => setScale((value) => Math.min(FONT_SCALE_MAX, value + FONT_SCALE_STEP))}
            accessibilityRole="button"
            accessibilityLabel={t('caption.fontSize')}
            style={styles.fontButton}
          >
            <Text style={styles.fontButtonText}>A＋</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={entries}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => <CaptionRow entry={item} targetLang={lang} scale={scale} />}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={() => setAutoScroll(false)}
        onContentSizeChange={() => {
          if (autoScroll) listRef.current?.scrollToEnd({ animated: true })
        }}
      />

      {!autoScroll && (
        <Pressable style={styles.resumeButton} onPress={resumeAutoScroll} accessibilityRole="button">
          <Text style={styles.resumeText}>↓ {t('caption.resume')}</Text>
        </Pressable>
      )}

      {ended && (
        <View style={styles.endedBanner}>
          <Text style={styles.endedText}>{t('caption.sessionEnded')}</Text>
        </View>
      )}

      {closed && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedText}>{t('connection.closed')}</Text>
          <Pressable onPress={() => setRetryToken((token) => token + 1)} accessibilityRole="button">
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  screen: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  sessionInfo: { flexShrink: 1 },
  sessionTitle: { fontSize: font.md, fontWeight: '700', color: color.text },
  speaker: { fontSize: font.xs, color: color.textMuted },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingBottom: space[3],
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
  fontControls: { flexDirection: 'row', gap: space[2] },
  fontButton: {
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: color.surfaceSubtle,
  },
  fontButtonText: { fontSize: font.sm, fontWeight: '700', color: color.text },
  listContent: { paddingHorizontal: space[4], paddingBottom: space[10], gap: space[4] },
  captionRow: { gap: space[1] },
  sourceText: { color: color.text, fontWeight: '600' },
  partialText: { color: color.textMuted, fontWeight: '400' },
  translationText: { color: color.primary },
  resumeButton: {
    position: 'absolute',
    bottom: space[6],
    alignSelf: 'center',
    backgroundColor: color.primary,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.full,
  },
  resumeText: { color: color.onPrimary, fontSize: font.sm, fontWeight: '600' },
  endedBanner: { padding: space[3], alignItems: 'center' },
  endedText: { color: color.textMuted, fontSize: font.sm },
  closedBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space[4],
    padding: space[4],
    backgroundColor: color.surfaceSubtle,
  },
  closedText: { color: color.danger, fontSize: font.sm },
  retryText: { color: color.primary, fontSize: font.sm, fontWeight: '700' },
}))
