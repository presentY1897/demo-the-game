import { useCallback, useEffect } from 'react'
import { controlSession, fetchSessionStatus, setSessionRate, type SessionAction } from '../api/sessions'
import { stepRate } from '../stores/consoleSelectors'
import { useConsoleStore } from '../stores/consoleStore'

/** 상세 화면의 status 폴링 주기. 시청자 수·진행률이 눈에 띄게 늦지 않을 만큼만 */
export const STATUS_POLL_MS = 2000

/**
 * 콘솔 상세가 서버 상태를 따라가는 유일한 경로.
 *
 * 자막 SSE에는 viewerCount·rate·진행률이 실리지 않으므로(참가자에게 필요 없는 값이다)
 * 운영 상태는 `GET /status` 폴링으로 본다. 다른 탭에서 조작했거나 스크립트가 끝까지
 * 재생돼 자동 종료된 경우도 이 폴링으로 들어온다.
 */
export function useSessionStatusPolling(sessionId: string | null, intervalMs = STATUS_POLL_MS): void {
  useEffect(() => {
    if (sessionId === null) return
    let cancelled = false

    const tick = async (): Promise<void> => {
      const result = await fetchSessionStatus(sessionId)
      if (cancelled) return
      const store = useConsoleStore.getState()
      if (result.ok) store.applyStatus(result.value, 'poll')
      else store.applyFailure(result.error, 'poll')
    }

    void tick()
    const timer = setInterval(() => void tick(), intervalMs)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [sessionId, intervalMs])
}

export interface SessionControl {
  /** 시작·일시정지·재개·종료 */
  run: (action: SessionAction) => void
  /** 재생 속도 한 단계 조절 (+1 빠르게 / −1 느리게) */
  changeRate: (direction: 1 | -1) => void
}

/**
 * 제어 호출 → 스토어 반영 글루.
 * 성공 응답이 곧 최신 status라 재조회 없이 그대로 반영하고, 실패는 안정 코드가 붙은
 * 값으로 스토어에 남겨 화면이 인라인으로 설명한다.
 */
export function useSessionControl(): SessionControl {
  const run = useCallback((action: SessionAction) => {
    const store = useConsoleStore.getState()
    const session = store.session
    if (session === null || store.pending !== null) return
    store.begin(action)
    void controlSession(session.id, action).then((result) => {
      const next = useConsoleStore.getState()
      if (result.ok) next.applyStatus(result.value, 'control')
      else next.applyFailure(result.error, 'control')
    })
  }, [])

  const changeRate = useCallback((direction: 1 | -1) => {
    const store = useConsoleStore.getState()
    const session = store.session
    const status = store.status
    if (session === null || status === null || store.pending !== null) return
    const rate = stepRate(status.rate, direction)
    if (rate === status.rate) return
    store.begin('rate')
    void setSessionRate(session.id, rate).then((result) => {
      const next = useConsoleStore.getState()
      if (result.ok) next.applyStatus(result.value, 'control')
      else next.applyFailure(result.error, 'control')
    })
  }, [])

  return { run, changeRate }
}
