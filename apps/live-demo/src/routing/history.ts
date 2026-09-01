import { setBackStrategy, useNav, type Route } from '../navigation'
import { parsePath, routeToPath } from './url'

/**
 * 라우트 스토어 ↔ History API 양방향 동기화 (웹 전용).
 *
 * - 초기 로드: 현재 URL을 파싱해 라우트로 바꾼다(딥링크 직행).
 * - `navigate()` → `pushState`, `replace()` → `replaceState`.
 * - 브라우저 뒤로가기(`popstate`) → 라우트를 되돌린다(다시 push하지 않는다).
 * - 앱 내 back → 앱이 쌓은 히스토리가 있으면 `history.back()`, 없으면 홈으로.
 *
 * `window`를 직접 잡지 않고 아래 포트만 받는다 — 테스트에서 가짜 히스토리로
 * pushState/popstate 왕복을 그대로 재현하기 위해서다.
 */
export interface HistoryLike {
  pushState: (data: unknown, unused: string, url: string) => void
  replaceState: (data: unknown, unused: string, url: string) => void
  back: () => void
}

export interface HistoryEnv {
  history: HistoryLike
  location: { pathname: string }
  addEventListener: (type: 'popstate', listener: () => void) => void
  removeEventListener: (type: 'popstate', listener: () => void) => void
}

/**
 * 동기화를 시작하고, 해제 함수를 돌려준다.
 * 반환된 함수를 부르기 전까지는 스토어 구독과 popstate 리스너가 살아 있다.
 */
export function connectHistory(env: HistoryEnv): () => void {
  /** 이 앱이 직접 쌓은 히스토리 칸 수 — 0이면 뒤로가기가 앱 밖으로 나가버린다 */
  let depth = 0

  const applyUrl = (route: Route, mode: 'push' | 'replace'): void => {
    const path = routeToPath(route)
    if (path === env.location.pathname) return
    if (mode === 'push') {
      env.history.pushState(null, '', path)
      depth += 1
      return
    }
    env.history.replaceState(null, '', path)
  }

  // 초기 진입: URL이 정본이다. 모르는 경로는 home으로 정규화하고 주소창도 맞춘다.
  const initial = parsePath(env.location.pathname)
  useNav.getState().replace(initial)
  applyUrl(initial, 'replace')

  const unsubscribe = useNav.subscribe((state, previous) => {
    if (state.route === previous.route) return
    applyUrl(state.route, state.mode)
  })

  const onPopState = (): void => {
    depth = Math.max(0, depth - 1)
    useNav.getState().replace(parsePath(env.location.pathname))
  }
  env.addEventListener('popstate', onPopState)

  setBackStrategy(() => {
    // 앱이 쌓은 칸이 있으면 브라우저 히스토리를 되감아 주소창과 화면을 함께 되돌린다.
    // 링크로 바로 들어온 첫 화면(depth 0)에서는 되감을 곳이 없어 홈으로 보낸다.
    if (depth > 0) {
      env.history.back()
      return
    }
    useNav.getState().navigate({ name: 'home' })
  })

  return () => {
    env.removeEventListener('popstate', onPopState)
    unsubscribe()
    setBackStrategy(null)
  }
}
