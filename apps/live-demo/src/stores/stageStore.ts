import { create } from 'zustand'

interface StageModeState {
  /** 스테이지 모드(어두운 강연장 시청) 활성 여부 */
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  toggle: () => void
}

/**
 * 스테이지 모드는 자막 화면의 토글이지만 테마(강제 다크)와 상태바까지
 * 앱 전역에 영향을 주므로 화면 로컬 state가 아니라 스토어로 둔다.
 */
export const useStageMode = create<StageModeState>((set) => ({
  enabled: false,
  setEnabled: (enabled) => set({ enabled }),
  toggle: () => set((state) => ({ enabled: !state.enabled })),
}))
