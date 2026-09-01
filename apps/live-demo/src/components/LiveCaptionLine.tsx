import { View } from 'react-native'
import { useCaptionStore } from '../stores/captionStore'
import { createThemedStyles, space, useThemedStyles } from '../theme'
import { CaptionRow } from './CaptionRow'

interface LiveCaptionLineProps {
  targetLang: string
  scale: number
  /** 콘솔의 자막 모니터처럼 이미 테두리가 있는 좁은 칸 안에 놓을 때 */
  compact?: boolean
}

/**
 * 지금 말하고 있는 문장 — 자막 히스토리 **아래에 고정된 한 줄**.
 *
 * 스토어의 `partial`을 **자기 자신만** 구독한다. 화면이 구독하면 단어가 하나 늘 때마다
 * 화면 전체(리스트 포함)가 리렌더된다 — 이 컴포넌트가 존재하는 이유가 그거다(docs/perf/001).
 *
 * 리스트의 마지막 줄이 아니라 고정된 줄로 뺀 것은 UX 판단이기도 하다. 지나간 대목을
 * 스크롤해 훑는 동안에도 진행 중인 문장이 화면에 남고, 자동 스크롤이 단어마다 리스트를
 * 밀어 올리지 않는다.
 *
 * 스크린리더 라이브 리전으로 두지 않는다 — 단어마다 갱신되는 텍스트를 계속 읽어주면
 * 확정된 자막을 훑는 것 자체가 불가능해진다.
 */
export function LiveCaptionLine({ targetLang, scale, compact = false }: LiveCaptionLineProps) {
  const styles = useThemedStyles(stylesFor)
  const partial = useCaptionStore((state) => state.partial)

  if (partial === null || partial.sourceText === '') return null

  return (
    <View style={[styles.live, compact && styles.compact]}>
      <CaptionRow entry={partial} targetLang={targetLang} scale={scale} />
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  live: {
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.surfaceSubtle,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  compact: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingTop: space[2],
    paddingBottom: 0,
  },
}))
