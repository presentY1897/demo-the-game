import type { CaptionEntry } from './captionStore'

export interface StageView {
  /** 마지막으로 확정된 자막 1건 */
  latestFinal: CaptionEntry | null
  /** 그 뒤에 진행 중인 부분 자막(있을 때만) */
  partial: CaptionEntry | null
}

/**
 * 스테이지 모드가 보여줄 것만 고른다 — "최신 확정 1건 + 진행 중 부분 자막".
 * 히스토리(`entries`)는 도착 순(오래된 → 최신)이므로 뒤에서부터 훑어 첫 확정 자막에서 멈춘다.
 * 번역만 먼저 도착해 원문이 빈 항목은 보여줄 게 없으므로 건너뛴다.
 *
 * 진행 중인 부분 자막은 히스토리에 없고 스토어의 `partial`로 따로 온다(docs/perf/001).
 */
export function selectStageView(
  entries: readonly CaptionEntry[],
  partial: CaptionEntry | null,
): StageView {
  let latestFinal: CaptionEntry | null = null

  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i]
    if (entry === undefined) continue
    if (entry.isFinal) {
      latestFinal = entry
      break
    }
  }

  return {
    latestFinal,
    partial: partial !== null && partial.sourceText.trim() !== '' ? partial : null,
  }
}
