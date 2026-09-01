import type { QueryClient } from '@tanstack/react-query'
import type { AdminSettings } from '@thegame/realtime'
import {
  ADMIN_ROOMS_POLL_MS,
  ADMIN_ROOMS_QUERY_KEY,
  ADMIN_SETTINGS_QUERY_KEY,
} from '../../api/adminKeys'
import { fetchAdminRooms, saveAdminSettings } from '../../api/admin'
import { fetchAdminSettings } from '../../api/sessions'
import { publishSavedSettings } from './settingsCache'

/** 관리자 화면의 쿼리 정의. 컴포넌트가 아니라 여기 모아 두어 조건을 한눈에 본다 */

export function adminRoomsQuery() {
  return {
    queryKey: ADMIN_ROOMS_QUERY_KEY,
    queryFn: fetchAdminRooms,
    // 소켓 대신 폴링 — 방 목록은 초 단위 정확도가 필요 없다(S14)
    refetchInterval: ADMIN_ROOMS_POLL_MS,
    retry: 1,
  }
}

export function adminSettingsQuery() {
  return {
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    queryFn: fetchAdminSettings,
    retry: 1,
  }
}

export function adminSettingsMutation(client: QueryClient) {
  return {
    mutationFn: (patientLangs: string[]): Promise<AdminSettings> => saveAdminSettings(patientLangs),
    onSuccess: (settings: AdminSettings): Promise<void> => publishSavedSettings(client, settings),
  }
}
