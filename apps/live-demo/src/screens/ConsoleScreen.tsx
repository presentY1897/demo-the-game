import { useConsoleStore } from '../stores/consoleStore'
import { SessionDetailView } from './console/SessionDetailView'
import { SessionListView } from './console/SessionListView'

/**
 * S13 — Symposia 운영 콘솔(간사·발표자).
 *
 * 목록 ↔ 상세는 라우트가 아니라 스토어의 `session` 하나로 가른다: 라우팅 표(S03)는
 * 다른 담당이 함께 쓰는 파일이라 `/console` 아래에 하위 경로를 늘리지 않았다.
 * 인증은 없다 — 콘솔은 URL을 아는 사람만 들어오는 데모 한계다(F01에 문서화).
 */
export function ConsoleScreen() {
  const session = useConsoleStore((state) => state.session)

  return session === null ? <SessionListView /> : <SessionDetailView session={session} />
}
