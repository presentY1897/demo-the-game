import { Text, View } from 'react-native'
import type { CaptionEntry } from '../stores/captionStore'
import { createThemedStyles, font, space, useThemedStyles } from '../theme'

/**
 * 자막 한 줄 — 원문(진행 중이면 ▌) + 확정 시 번역.
 *
 * 참가자 화면(`SymposiaScreen`)과 운영 콘솔의 자막 모니터가 **같은 컴포넌트**를 쓴다.
 * "모니터가 참가자와 같은 내용을 보여준다"(S13 완성 기준 4)를 두 벌 구현으로 흉내 내지
 * 않기 위해서다 — 표시 규칙이 갈라질 자리를 없앤다.
 */
export function CaptionRow({
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
        style={[styles.sourceText, { fontSize: font.md * scale }, !entry.isFinal && styles.partialText]}
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

const stylesFor = createThemedStyles((color) => ({
  captionRow: { gap: space[1] },
  sourceText: { color: color.text, fontWeight: '600' },
  partialText: { color: color.textMuted, fontWeight: '400' },
  translationText: { color: color.primary },
}))
