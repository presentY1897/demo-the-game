import { useMemo } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useT } from '../i18n'
import { selectStageView, type StageView } from '../stores/captionSelectors'
import { useCaptionStore } from '../stores/captionStore'
import { createThemedStyles, font, space, useThemedStyles } from '../theme'

/** 스테이지 모드 기본 타이포 — 히스토리 뷰(font.md=16)보다 크게 잡는다 */
const SOURCE_SIZE = font['2xl']
const SECONDARY_SIZE = font.xl

/**
 * 글자 크기만 준다. `lineHeight`를 숫자로 박으면 OS 글자 확대에서 잘린다 —
 * RN은 `fontSize`만 fontScale로 키우고 `lineHeight`는 그대로 두기 때문이다.
 * 이 화면은 자체 배율(A−/A＋)까지 겹치므로 특히 위험했다 (S06 기준 4).
 */
const sized = (base: number, scale: number) => ({ fontSize: base * scale })

interface StageCaptionProps {
  view: StageView
  targetLang: string
  scale: number
}

/**
 * 어두운 강연장에서 폰을 들고 보는 화면.
 * 히스토리 대신 "최신 확정 1건 + 진행 중 부분 자막"만 대형으로 띄운다.
 */
export function StageCaption({ view, targetLang, scale }: StageCaptionProps) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)
  const { latestFinal, partial } = view

  if (latestFinal === null && partial === null) {
    return (
      <View style={styles.empty}>
        <Text style={styles.waiting}>{t('caption.waiting')}</Text>
      </View>
    )
  }

  const translation = latestFinal === null ? undefined : latestFinal.translations[targetLang]

  return (
    <ScrollView style={styles.stage} contentContainerStyle={styles.stageContent}>
      {latestFinal !== null && (
        <>
          <Text style={[styles.source, sized(SOURCE_SIZE, scale)]}>{latestFinal.sourceText}</Text>
          <Text style={[styles.translation, sized(SECONDARY_SIZE, scale)]}>
            {translation ?? '…'}
          </Text>
        </>
      )}
      {partial !== null && (
        <Text style={[styles.partial, sized(SECONDARY_SIZE, scale)]}>{partial.sourceText} ▌</Text>
      )}
    </ScrollView>
  )
}

/**
 * 스테이지 모드의 자막 — 스토어를 **여기서** 구독한다.
 *
 * 화면(`SymposiaScreen`)이 구독하면 부분 자막 한 단어마다 화면 전체와 그 아래
 * 자막 리스트까지 리렌더된다(스테이지 모드에서도 리스트는 마운트된 채로 덮여 있다).
 * 구독을 이 잎 컴포넌트로 내려 리렌더 범위를 "지금 보이는 자막"으로 묶는다 (docs/perf/001).
 */
export function LiveStageCaption({ targetLang, scale }: Omit<StageCaptionProps, 'view'>) {
  const entries = useCaptionStore((state) => state.entries)
  const partial = useCaptionStore((state) => state.partial)
  const view = useMemo(() => selectStageView(entries, partial), [entries, partial])

  return <StageCaption view={view} targetLang={targetLang} scale={scale} />
}

const stylesFor = createThemedStyles((color) => ({
  stage: { flex: 1 },
  stageContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space[5],
    paddingVertical: space[6],
    gap: space[3],
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[5] },
  waiting: { fontSize: font.lg, color: color.textMuted },
  source: { color: color.text, fontWeight: '700' },
  translation: { color: color.primary, fontWeight: '600' },
  partial: { color: color.textMuted },
}))
