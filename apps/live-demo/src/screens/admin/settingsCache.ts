import type { QueryClient } from '@tanstack/react-query'
import type { AdminSettings } from '@thegame/realtime'
import { ADMIN_SETTINGS_QUERY_KEY } from '../../api/adminKeys'

/**
 * 기관 설정을 저장한 뒤 캐시에 알리는 한 곳(S14 완성 기준 2).
 *
 * 두 가지를 같이 해야 한다.
 * 1) `setQueryData` — 관리자 화면이 왕복을 기다리지 않고 저장된 값을 바로 그린다.
 * 2) `invalidateQueries` — 같은 키를 보는 **환자 온보딩(`useLanguageOptions`)** 을 깨운다.
 *    온보딩의 `staleTime`이 60초라, 무효화하지 않으면 최대 1분 동안 옛 언어 목록을 보여준다.
 */
export async function publishSavedSettings(
  client: QueryClient,
  settings: AdminSettings,
): Promise<void> {
  client.setQueryData(ADMIN_SETTINGS_QUERY_KEY, settings)
  await client.invalidateQueries({ queryKey: ADMIN_SETTINGS_QUERY_KEY })
}
