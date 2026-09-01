import { create } from 'zustand'
import type { ParticipantRole } from '@thegame/realtime'

/**
 * CareTalk 진입 온보딩의 선택 결과.
 *
 * 역할은 홈의 진입 버튼("새 대화 시작" / "초대 코드로 입장")에서 이미 정해지므로
 * 온보딩에 남는 단계는 **언어 하나**뿐이다(S02). 여기 값이 그대로
 * `useConversation(roomId, role, lang)`으로 들어간다 — 하드코딩 `('patient','en')`의 자리.
 */

/** 역할별 기본 언어. 의료진은 한국어, 환자는 영어에서 시작해 바꾼다 */
export const DEFAULT_LANG_FOR: Record<ParticipantRole, string> = {
  staff: 'ko',
  patient: 'en',
}

interface OnboardingState {
  role: ParticipantRole | null
  /** 언어 단계에서 고른 값. 역할을 정하면 그 역할의 기본값이 먼저 놓인다 */
  lang: string | null
  /** 언어 단계를 지났는지 — 기본값이 채워져 있어도 사용자가 확인해야 넘어간다 */
  confirmed: boolean
  setRole: (role: ParticipantRole) => void
  setLang: (lang: string) => void
  confirm: () => void
  /** 저장된 이전 선택을 되살린다 — 온보딩을 다시 태우지 않는다 */
  restore: (role: ParticipantRole, lang: string) => void
  reset: () => void
}

export const useOnboarding = create<OnboardingState>((set) => ({
  role: null,
  lang: null,
  confirmed: false,

  setRole: (role) => set({ role, lang: DEFAULT_LANG_FOR[role], confirmed: false }),
  setLang: (lang) => set({ lang }),
  confirm: () => set({ confirmed: true }),
  restore: (role, lang) => set({ role, lang, confirmed: true }),
  reset: () => set({ role: null, lang: null, confirmed: false }),
}))
