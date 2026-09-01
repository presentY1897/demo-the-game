import { create } from 'zustand'

/**
 * 앱의 라우트. URL 어댑터(`src/routing/history.ts`)가 이 스토어와 History API를
 * 양방향으로 동기화한다 — 스토어 자체는 플랫폼을 모른다.
 *
 * 라우트를 늘릴 때는 (1) 여기 유니온에 추가하고 (2) `routing/url.ts`의 parse/serialize에
 * 경로를 더하고 (3) `App.tsx`의 Router에 화면을 붙인다. 그 셋이 전부다.
 */
export type Route =
  | { name: 'home' }
  | { name: 'symposia'; sessionId: string }
  /** 초대 코드가 있으면 그 방으로 직행, 없으면 CareTalk 진입 단계부터 */
  | { name: 'caretalk'; inviteCode?: string }
  | { name: 'console' }
  | { name: 'admin' }

/**
 * 라우트 변경이 히스토리에 쌓여야 하는지. 어댑터가 이 값을 보고
 * pushState/replaceState를 고른다 — popstate 반영이 다시 push되는 순환을 막는다.
 */
export type NavMode = 'push' | 'replace'

/**
 * 뒤로 가기 동작을 갈아끼우는 자리. 웹에서는 히스토리 어댑터가
 * `window.history.back()`을 꽂아 브라우저 뒤로가기와 앱 내 back을 일치시킨다.
 * 아무도 꽂지 않으면(네이티브·테스트) 홈으로 돌아간다.
 */
type BackStrategy = () => void

let backStrategy: BackStrategy | null = null

export function setBackStrategy(strategy: BackStrategy | null): void {
  backStrategy = strategy
}

interface NavState {
  route: Route
  mode: NavMode
  /** 새 화면으로 이동 — 웹에서는 히스토리에 한 칸 쌓인다 */
  navigate: (route: Route) => void
  /** 히스토리를 쌓지 않고 현재 라우트만 갈아끼운다 (popstate 반영·초기 진입) */
  replace: (route: Route) => void
  back: () => void
}

export const useNav = create<NavState>((set) => ({
  route: { name: 'home' },
  mode: 'replace',
  navigate: (route) => set({ route, mode: 'push' }),
  replace: (route) => set({ route, mode: 'replace' }),
  back: () => {
    if (backStrategy !== null) {
      backStrategy()
      return
    }
    set({ route: { name: 'home' }, mode: 'push' })
  },
}))
