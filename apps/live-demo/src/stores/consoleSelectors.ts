import {
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  type SessionState,
  type SessionStatus,
} from '@thegame/realtime'
import type { SessionAction } from '../api/sessions'
import type { PendingControl } from './consoleStore'

/** 재생 속도 한 단계. 0.5–2 범위를 0.25씩 오가면 눌러서 도달하는 값이 전부 유효하다 */
export const RATE_STEP = 0.25

/**
 * 서버 상태 머신(`waiting → playing ⇄ paused → ended`)의 거울.
 * 여기서 막아야 누를 수 없는 버튼이 409 `invalid-transition`으로 되돌아오지 않는다.
 */
export function canTransition(state: SessionState, action: SessionAction): boolean {
  switch (action) {
    case 'start':
      return state === 'waiting'
    case 'pause':
      return state === 'playing'
    case 'resume':
      return state === 'paused'
    case 'end':
      return state !== 'ended'
  }
}

/** 종료된 세션은 속도도 못 바꾼다 — 서버가 409로 거절한다 */
export function canSetRate(state: SessionState): boolean {
  return state !== 'ended'
}

/**
 * 한 단계 조절한 재생 속도.
 * 서버 허용 범위(0.5–2) 밖으로 나가지 않게 자르고, 0.25를 더해 생기는 부동소수점
 * 찌꺼기(1.7500000000000002)를 소수 둘째 자리에서 정리한다 — 그대로 보내면
 * 화면 표시도 요청 본문도 지저분해진다.
 */
export function stepRate(rate: number, direction: 1 | -1): number {
  const stepped = rate + direction * RATE_STEP
  const clamped = Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, stepped))
  return Math.round(clamped * 100) / 100
}

/** 콘솔 상세의 버튼 활성화 조건 — 화면은 이 값만 보고 그린다 */
export interface ControlAvailability {
  start: boolean
  pause: boolean
  resume: boolean
  end: boolean
  slower: boolean
  faster: boolean
}

const ALL_LOCKED: ControlAvailability = {
  start: false,
  pause: false,
  resume: false,
  end: false,
  slower: false,
  faster: false,
}

/**
 * 상태를 아직 모르거나(첫 폴링 전) 앞선 요청이 떠 있으면 전부 잠근다.
 * 연타로 `start`가 두 번 나가 두 번째가 409로 돌아오는 자리를 없앤다.
 */
export function selectControls(
  status: SessionStatus | null,
  pending: PendingControl | null,
): ControlAvailability {
  if (status === null || pending !== null) return ALL_LOCKED
  const rateAllowed = canSetRate(status.state)
  return {
    start: canTransition(status.state, 'start'),
    pause: canTransition(status.state, 'pause'),
    resume: canTransition(status.state, 'resume'),
    end: canTransition(status.state, 'end'),
    slower: rateAllowed && status.rate > MIN_PLAYBACK_RATE,
    faster: rateAllowed && status.rate < MAX_PLAYBACK_RATE,
  }
}

/** 진행률(0–1). 총 문장 수가 0인 스크립트에서도 NaN을 만들지 않는다 */
export function selectProgress(status: SessionStatus | null): number {
  if (status === null || status.total <= 0) return 0
  return Math.min(1, status.position / status.total)
}
