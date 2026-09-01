import { useKeepAwake } from 'expo-keep-awake'

/**
 * 마운트돼 있는 동안만 화면 꺼짐을 막는다.
 * 조건부 렌더로 켜고 끄면(hook 규칙을 어기지 않고) 언마운트 시 해제가 보장된다 —
 * 스테이지 모드 OFF, 화면 이탈, 앱 종료 모두 같은 경로로 풀린다.
 * 웹에서는 Wake Lock API가 없는 브라우저면 조용히 무시된다.
 */
export function KeepScreenAwake(): null {
  useKeepAwake()
  return null
}
