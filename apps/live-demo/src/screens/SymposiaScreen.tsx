import { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, Pressable, Text, View, type ListRenderItemInfo } from 'react-native'
import { ActionButton } from '../components/ActionButton'
import { CaptionRow } from '../components/CaptionRow'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { KeepScreenAwake } from '../components/KeepScreenAwake'
import { LiveCaptionLine } from '../components/LiveCaptionLine'
import { LiveStageCaption } from '../components/StageCaption'
import { useCaptionStream } from '../hooks/useCaptionStream'
import { languageLabel, useT } from '../i18n'
import { useNav } from '../navigation'
import { useCaptionStore, type CaptionEntry } from '../stores/captionStore'
import { useStageMode } from '../stores/stageStore'
import { createThemedStyles, font, radius, space, useThemedStyles } from '../theme'

/** S06 기준 3: 최소 터치 타깃 */
const TOUCH_TARGET = 44

const FONT_SCALE_MIN = 0.85
const FONT_SCALE_MAX = 1.6
const FONT_SCALE_STEP = 0.15

export function SymposiaScreen({ sessionId }: { sessionId: string }) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)
  const [lang, setLang] = useState('en')
  const [scale, setScale] = useState(1)
  const [autoScroll, setAutoScroll] = useState(true)
  const [retryToken, setRetryToken] = useState(0)
  /** 종료 안내를 닫고 지나간 자막을 다시 훑는 중인지 */
  const [reviewing, setReviewing] = useState(false)
  const listRef = useRef<FlatList<CaptionEntry>>(null)

  useCaptionStream(sessionId, lang, retryToken)
  const status = useCaptionStore((state) => state.status)
  const session = useCaptionStore((state) => state.session)
  const entries = useCaptionStore((state) => state.entries)
  const ended = useCaptionStore((state) => state.ended)

  const navigate = useNav((state) => state.navigate)

  const stage = useStageMode((state) => state.enabled)
  const toggleStage = useStageMode((state) => state.toggle)

  // 셀 렌더러를 고정한다 — 매 렌더마다 새 함수를 주면 memo된 줄의 props가 흔들린다
  const renderRow = useCallback(
    ({ item }: ListRenderItemInfo<CaptionEntry>) => (
      <CaptionRow entry={item} targetLang={lang} scale={scale} />
    ),
    [lang, scale],
  )

  // 스테이지 모드는 이 화면의 맥락(강연장 시청) 전용이라 화면을 벗어나면 반드시 풀린다 —
  // 강제 다크와 keep-awake가 홈/CareTalk까지 따라가지 않게.
  useEffect(() => () => useStageMode.getState().setEnabled(false), [])

  // 세션 루프가 새로 시작되면(ended → false) 종료 안내를 다시 쓸 수 있게 되돌린다
  useEffect(() => {
    if (!ended) setReviewing(false)
  }, [ended])

  const languages = session?.targetLangs ?? ['en', 'ja', 'zh']
  const closed = status.state === 'closed'

  const resumeAutoScroll = () => {
    setAutoScroll(true)
    listRef.current?.scrollToEnd({ animated: true })
  }

  return (
    <View style={styles.screen}>
      {stage && <KeepScreenAwake />}

      <View style={styles.toolbar}>
        <View style={styles.sessionInfo}>
          {/* 글자를 키우면 한 줄 고정은 곧 잘림이다 — 줄바꿈을 허용한다 (S06 기준 4) */}
          <Text style={styles.sessionTitle}>{session?.title ?? t('common.loading')}</Text>
          {session && <Text style={styles.speaker}>{session.speaker}</Text>}
        </View>
        <ConnectionBadge status={status} />
      </View>

      <View style={styles.controls}>
        <View
          style={styles.langChips}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('caption.language')}
        >
          {languages.map((code) => (
            <Pressable
              key={code}
              onPress={() => setLang(code)}
              accessibilityRole="radio"
              // 칩에는 코드(EN)만 보이지만 읽어줄 이름은 언어 이름이어야 한다
              accessibilityLabel={languageLabel(t, code)}
              aria-checked={lang === code}
              style={[styles.chip, lang === code && styles.chipActive]}
            >
              <Text style={[styles.chipText, lang === code && styles.chipTextActive]}>
                {code.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.rightControls}>
          <Pressable
            onPress={toggleStage}
            accessibilityRole="switch"
            aria-checked={stage}
            accessibilityLabel={t('caption.stageMode')}
            accessibilityHint={t('caption.stageModeHint')}
            style={[styles.stageToggle, stage && styles.stageToggleActive]}
          >
            <Text style={[styles.stageToggleText, stage && styles.stageToggleTextActive]}>
              {t('caption.stageMode')}
            </Text>
          </Pressable>
          {/* "A−"/"A＋"는 번역할 문장이 아니라 글자 크기를 뜻하는 기호다 — ko/en이 같고
              사전에 넣으면 로케일마다 달라질 수 있는 값이 된다. 대신 스크린리더가 읽을
              이름을 accessibilityLabel로 따로 준다(두 버튼이 서로 다른 이름을 갖는다). */}
          <Pressable
            onPress={() => setScale((value) => Math.max(FONT_SCALE_MIN, value - FONT_SCALE_STEP))}
            accessibilityRole="button"
            accessibilityLabel={t('caption.fontSmaller')}
            style={styles.fontButton}
          >
            {/* eslint-disable-next-line @thegame/no-hardcoded-ui-string -- 타이포 기호(위 주석) */}
            <Text style={styles.fontButtonText}>A−</Text>
          </Pressable>
          <Pressable
            onPress={() => setScale((value) => Math.min(FONT_SCALE_MAX, value + FONT_SCALE_STEP))}
            accessibilityRole="button"
            accessibilityLabel={t('caption.fontLarger')}
            style={styles.fontButton}
          >
            {/* eslint-disable-next-line @thegame/no-hardcoded-ui-string -- 타이포 기호(위 주석) */}
            <Text style={styles.fontButtonText}>A＋</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.captionArea}>
        {/* 스테이지 모드에서도 리스트는 마운트된 채 덮기만 한다 — 토글 왕복 시 스크롤 위치 보존 */}
        <View
          style={styles.listWrap}
          accessibilityElementsHidden={stage}
          importantForAccessibility={stage ? 'no-hide-descendants' : 'auto'}
        >
          <FlatList
            ref={listRef}
            style={styles.list}
            data={entries}
            keyExtractor={(entry) => entry.id}
            renderItem={renderRow}
            contentContainerStyle={styles.listContent}
            onScrollBeginDrag={() => setAutoScroll(false)}
            onContentSizeChange={() => {
              if (autoScroll) listRef.current?.scrollToEnd({ animated: true })
            }}
          />
          {/* 진행 중인 문장은 리스트 밖에 고정된 한 줄로 — 스토어를 스스로 구독한다 */}
          <LiveCaptionLine targetLang={lang} scale={scale} />
        </View>

        {stage && (
          <View style={styles.stageOverlay}>
            <LiveStageCaption targetLang={lang} scale={scale} />
          </View>
        )}

        {!stage && !autoScroll && !ended && (
          <Pressable
            style={styles.resumeButton}
            onPress={resumeAutoScroll}
            accessibilityRole="button"
          >
            <Text style={styles.resumeText}>↓ {t('caption.resume')}</Text>
          </Pressable>
        )}

        {/* 세션이 끝나면 자막만 멈추는 게 아니라 다음 행동을 준다 —
            강연장을 나서는 사람은 홈으로, 놓친 대목을 찾는 사람은 자막으로 (S13) */}
        {ended && !reviewing && (
          <View style={styles.endedOverlay} accessibilityRole="alert">
            <View style={styles.endedCard}>
              <Text style={styles.endedTitle}>{t('console.ended.title')}</Text>
              <Text style={styles.endedBody}>{t('console.ended.body')}</Text>
              <ActionButton label={t('console.ended.home')} onPress={() => navigate({ name: 'home' })} />
              <ActionButton
                label={t('console.ended.review')}
                variant="secondary"
                onPress={() => setReviewing(true)}
              />
            </View>
          </View>
        )}
      </View>

      {ended && reviewing && (
        <View style={styles.endedBanner}>
          <Text style={styles.endedText}>{t('caption.sessionEnded')}</Text>
          <Pressable
            onPress={() => navigate({ name: 'home' })}
            accessibilityRole="button"
            style={styles.bannerAction}
          >
            <Text style={styles.endedLink}>{t('console.ended.home')}</Text>
          </Pressable>
        </View>
      )}

      {closed && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedText}>{t('connection.closed')}</Text>
          <Pressable
            onPress={() => setRetryToken((token) => token + 1)}
            accessibilityRole="button"
            style={styles.bannerAction}
          >
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
    flexWrap: 'wrap',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingBottom: space[3],
  },
  langChips: { flexDirection: 'row', gap: space[2] },
  chip: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSubtle,
  },
  chipActive: { backgroundColor: color.primary },
  chipText: { fontSize: font.xs, fontWeight: '600', color: color.textMuted },
  chipTextActive: { color: color.onPrimary },
  rightControls: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  stageToggle: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: color.surfaceSubtle,
  },
  stageToggleActive: { backgroundColor: color.primary },
  stageToggleText: { fontSize: font.xs, fontWeight: '600', color: color.textMuted },
  stageToggleTextActive: { color: color.onPrimary },
  fontButton: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: color.surfaceSubtle,
  },
  fontButtonText: { fontSize: font.sm, fontWeight: '700', color: color.text },
  captionArea: { flex: 1 },
  listWrap: { flex: 1 },
  list: { flex: 1 },
  stageOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: color.bg,
  },
  // 자막은 아래에서 위로 쌓인다 — 진행 중인 문장(리스트 바로 아래 고정)과 붙어 있어야
  // 시작 직후 화면이 절반 비어 보이지 않는다. 내용이 넘치면 평소처럼 스크롤된다.
  listContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[4],
    gap: space[4],
  },
  resumeButton: {
    position: 'absolute',
    bottom: space[6],
    alignSelf: 'center',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    backgroundColor: color.primary,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.full,
  },
  resumeText: { color: color.onPrimary, fontSize: font.sm, fontWeight: '600' },
  endedOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[5],
    backgroundColor: `${color.bg}F2`,
  },
  endedCard: {
    width: '100%',
    maxWidth: 360,
    gap: space[3],
    padding: space[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  endedTitle: { fontSize: font.xl, fontWeight: '700', color: color.text },
  endedBody: { fontSize: font.sm, color: color.textMuted },
  endedBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
  },
  bannerAction: { minHeight: TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: space[2] },
  endedText: { color: color.textMuted, fontSize: font.sm },
  endedLink: { color: color.primary, fontSize: font.sm, fontWeight: '700' },
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
