/**
 * 퀵 리플라이 칩의 동작 규칙 (S05).
 *
 * 컴포넌트에서 떼어 낸 순수 로직이다 — RN 렌더 테스트 없이도
 * "탭 → 즉시 전송", "길게 누르기 → 입력창 삽입", "포커스 → 접힘"을 검증할 수 있다.
 */

export interface QuickReplyDeps {
  /** 소켓으로 바로 내보낸다 */
  say: (text: string) => void
  /** 현재 입력창 내용 */
  draft: string
  setDraft: (next: string) => void
  /** 삽입 후 커서를 입력창으로 옮긴다 (그 결과 칩 영역은 접힌다) */
  focusInput: () => void
}

export interface QuickReplyHandlers {
  /** 탭 — 편집 없이 즉시 전송. 입력 중이던 초안은 건드리지 않는다 */
  onTap: (text: string) => void
  /** 길게 누르기 — 전송하지 않고 입력창에 넣어 고칠 수 있게 한다 */
  onLongPress: (text: string) => void
}

/**
 * 초안에 문구를 이어 붙인다. 이미 쓰던 말이 있으면 지우지 않고 뒤에 붙인다 —
 * 길게 누르기는 "고쳐 쓰기"지 "덮어쓰기"가 아니다.
 */
export function insertIntoDraft(draft: string, text: string): string {
  const phrase = text.trim()
  if (phrase === '') return draft
  const current = draft.trimEnd()
  return current === '' ? phrase : `${current} ${phrase}`
}

export function createQuickReplyHandlers({
  say,
  draft,
  setDraft,
  focusInput,
}: QuickReplyDeps): QuickReplyHandlers {
  return {
    onTap: (text) => {
      // 빈 문구는 카탈로그상 나올 수 없지만, 나온다면 조용히 빈 말풍선을 만드는
      // 대신 아무 일도 하지 않는다 (say도 같은 방어를 한다)
      if (text.trim() === '') return
      say(text)
    },
    onLongPress: (text) => {
      const next = insertIntoDraft(draft, text)
      if (next === draft) return
      setDraft(next)
      focusInput()
    },
  }
}

export type QuickReplyBarEvent = 'focus' | 'blur' | 'toggle'

/**
 * 칩 영역 접힘 상태의 다음 값.
 *
 * - 입력창에 포커스가 가면 접는다 — 키보드가 올라온 상태에서 칩까지 자리를 먹으면
 *   대화가 안 보인다(명세: "입력창 포커스 시 자동 접힘").
 * - 포커스를 잃으면 다시 펼치되, 쓰다 만 초안이 남아 있으면 접은 채로 둔다 —
 *   사용자가 자유 입력 쪽을 택한 상태이므로 화면을 흔들지 않는다.
 * - 토글 버튼은 언제나 사용자의 명시적 선택이 이긴다.
 */
export function nextCollapsed(
  event: QuickReplyBarEvent,
  collapsed: boolean,
  draft: string,
): boolean {
  switch (event) {
    case 'focus':
      return true
    case 'blur':
      return draft.trim() !== ''
    case 'toggle':
      return !collapsed
  }
}
