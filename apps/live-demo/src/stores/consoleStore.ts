import { create } from 'zustand'
import type { SessionStatus, SessionSummary } from '@thegame/realtime'
import type { ApiFailure } from '../api/client'
import type { SessionAction } from '../api/sessions'

/**
 * 운영 콘솔의 세션 상세 상태 (S13).
 *
 * 서버가 상태 머신의 정본이고 여기는 그 거울이다 — 화면은 낙관적으로 상태를 바꾸지 않고
 * **제어 응답(= status)** 과 **폴링 결과**만 반영한다. 그래서 새로고침·다른 탭에서의
 * 조작·스크립트 자동 종료가 전부 같은 경로로 들어온다.
 *
 * API 호출은 이 스토어에 두지 않는다(`hooks/useSessionControl.ts`가 한다) —
 * 스토어를 순수 상태 전이로 남겨 두면 fetch 스텁 없이 단위 테스트가 된다.
 */

/** 서버 응답을 기다리는 중인 조작. 버튼 잠금과 폴링 되감기 방지에 함께 쓰인다 */
export type PendingControl = SessionAction | 'rate'

/**
 * 상태·실패가 어디서 왔는지. 뒤늦게 도착한 폴링 응답이 방금 누른 제어의 결과를
 * 덮어써 화면이 되감기는 것을 막는 구분이다.
 */
export type StatusSource = 'control' | 'poll'

interface ConsoleState {
  /** 운영 중인 세션. null이면 콘솔은 목록 화면을 보여준다 */
  session: SessionSummary | null
  /** 마지막으로 확인된 서버 상태. 첫 폴링 전에는 null(= 아직 모름) */
  status: SessionStatus | null
  pending: PendingControl | null
  /** 마지막 실패 — 화면이 인라인으로 보여준다(무음 실패 금지) */
  failure: ApiFailure | null
  open: (session: SessionSummary) => void
  close: () => void
  begin: (control: PendingControl) => void
  applyStatus: (status: SessionStatus, source: StatusSource) => void
  applyFailure: (failure: ApiFailure, source: StatusSource) => void
  dismissFailure: () => void
}

export const useConsoleStore = create<ConsoleState>((set) => ({
  session: null,
  status: null,
  pending: null,
  failure: null,

  open: (session) => set({ session, status: null, pending: null, failure: null }),
  close: () => set({ session: null, status: null, pending: null, failure: null }),
  begin: (control) => set({ pending: control, failure: null }),
  dismissFailure: () => set({ failure: null }),

  applyStatus: (status, source) =>
    set((state) => {
      if (source === 'poll') {
        // 제어 응답이 곧 올 자리다. 그 직전 상태를 담은 폴링은 버린다
        if (state.pending !== null) return {}
        // 연결이 돌아왔으면 "서버에 연결하지 못했습니다"는 더 이상 사실이 아니다.
        // 반대로 invalid-transition 같은 조작 실패는 다음 조작까지 남겨 둔다.
        return state.failure?.code === 'network' ? { status, failure: null } : { status }
      }
      return { status, pending: null, failure: null }
    }),

  applyFailure: (failure, source) =>
    set((state) => {
      if (source === 'poll' && state.pending !== null) return {}
      return { failure, pending: source === 'control' ? null : state.pending }
    }),
}))
