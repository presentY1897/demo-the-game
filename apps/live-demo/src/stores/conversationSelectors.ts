import type { ParticipantRole } from '@thegame/realtime'
import type { ChatMessage } from './conversationStore'

/**
 * 상대가 쓰는 언어. 방에 들어가는 순간에는 알 수 없고(서버가 알려주지 않는다)
 * 첫 발화에서 드러난다 — 상대 말의 원문 언어, 또는 내 말이 번역돼 간 언어.
 * 모르는 동안은 null을 돌려 헤더가 "환자(?)" 같은 거짓말을 하지 않게 한다.
 */
export function selectPeerLang(
  messages: readonly ChatMessage[],
  myRole: ParticipantRole,
): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message === undefined) continue
    return message.role === myRole ? message.translationLang : message.lang
  }
  return null
}
