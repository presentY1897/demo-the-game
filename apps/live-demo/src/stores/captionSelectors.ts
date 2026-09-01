import type { CaptionEntry } from './captionStore'

export interface StageView {
  /** 마지막으로 확정된 자막 1건 */
  latestFinal: CaptionEntry | null
  /** 그 뒤에 진행 중인 부분 자막(있을 때만) */
  partial: CaptionEntry | null
}

/**
 * 스테이지 모드가 보여줄 것만 고른다 — "최신 확정 1건 + 진행 중 부분 자막".
 * entries는 도착 순(오래된 → 최신)이므로 뒤에서부터 훑고,
 * 첫 확정 자막을 만나면 멈춘다. 그 이전의 비확정 항목은 이미 지나간 것이라 버린다.
 * 번역만 먼저 도착해 원문이 빈 항목은 보여줄 게 없으므로 부분 자막으로 치지 않는다.
 */
export function selectStageView(entries: readonly CaptionEntry[]): StageView {
  let latestFinal: CaptionEntry | null = null
  let partial: CaptionEntry | null = null

  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i]
    if (entry === undefined) continue
    if (entry.isFinal) {
      latestFinal = entry
      break
    }
    if (partial === null && entry.sourceText.trim() !== '') partial = entry
  }

  return { latestFinal, partial }
}
