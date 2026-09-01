import { ScrollView, Text, View } from 'react-native'
import { useT } from '../i18n'
import type { StageView } from '../stores/captionSelectors'
import { createThemedStyles, font, space, useThemedStyles } from '../theme'

/** 스테이지 모드 기본 타이포 — 히스토리 뷰(font.md=16)보다 크게 잡는다 */
const SOURCE_SIZE = font['2xl']
const SECONDARY_SIZE = font.xl
const LINE_HEIGHT = 1.35

const sized = (base: number, scale: number) => ({
  fontSize: base * scale,
  lineHeight: base * scale * LINE_HEIGHT,
})

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
    <ScrollView
      style={styles.stage}
      contentContainerStyle={styles.stageContent}
      accessibilityRole="summary"
    >
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
