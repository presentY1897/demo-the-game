import type { MessageKey } from '@thegame/i18n'
import type { AdminSettings } from '@thegame/realtime'

/**
 * 지원 언어 토글의 규칙(S14). 화면 컴포넌트가 아니라 여기에 두는 이유는
 * "마지막 언어를 끌 수 없다" 같은 규칙이 서버 계약과 짝을 이루기 때문이다 —
 * 서버는 빈 목록을 400으로 거절하고, 화면은 그 전에 이유를 말해 준다.
 */

/**
 * 토글 목록에 그릴 언어. 기본은 서버가 준 후보(`supportedLangs`) 순서다.
 * 후보에서 빠졌는데 아직 켜져 있는 코드가 있으면 뒤에 붙인다 —
 * 목록에 없다는 이유로 조용히 꺼진 것처럼 보이면 안 된다.
 */
export function toggleListLangs(settings: AdminSettings): string[] {
  const list = [...settings.supportedLangs]
  for (const code of settings.patientLangs) {
    if (!list.includes(code)) list.push(code)
  }
  return list
}

export type ToggleResult =
  | { ok: true; next: string[] }
  /** 마지막 하나를 끄려 했다 — 서버(400 invalid-body)에 가기 전에 막는다 */
  | { ok: false; reason: 'last-language' }

/** 켜고 끄기. 켤 때는 목록 순서를 유지해 저장 결과가 화면 순서와 어긋나지 않게 한다 */
export function toggleLanguage(
  selected: readonly string[],
  listOrder: readonly string[],
  code: string,
): ToggleResult {
  if (selected.includes(code)) {
    if (selected.length <= 1) return { ok: false, reason: 'last-language' }
    return { ok: true, next: selected.filter((lang) => lang !== code) }
  }
  const next = [...selected, code]
  const rank = (lang: string): number => {
    const index = listOrder.indexOf(lang)
    return index === -1 ? listOrder.length : index
  }
  return { ok: true, next: next.sort((a, b) => rank(a) - rank(b)) }
}

/** 저장 버튼을 켤지 판단하는 비교. 순서가 달라도 같은 집합이면 저장할 게 없다 */
export function sameLangs(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const other = new Set(b)
  return a.every((code) => other.has(code))
}

/**
 * 저장 실패를 사용자 말로 옮긴다. 코드를 그대로 노출하거나
 * "저장 실패"만 띄우고 이유를 삼키지 않기 위한 매핑이다.
 */
export function saveErrorKey(code: string): MessageKey {
  switch (code) {
    case 'unsupported-language':
      return 'admin.langUnsupported'
    // 서버는 빈 목록을 zod 단계에서 invalid-body로 되돌려 준다
    case 'invalid-body':
      return 'admin.langLastOne'
    case 'network':
      return 'admin.langOffline'
    default:
      return 'admin.langSaveFailed'
  }
}
