import { useQuery } from '@tanstack/react-query'
import type { ParticipantRole } from '@thegame/realtime'
import { ADMIN_SETTINGS_QUERY_KEY } from '../api/admin'
import { fetchAdminSettings } from '../api/sessions'
import { selectPatientLangs, selectStaffLangs } from '../stores/languageSelectors'

interface LanguageOptions {
  options: string[]
  loading: boolean
  /** 기관 설정을 못 읽어 i18n 리소스 기준 폴백을 쓰고 있는지 */
  fallback: boolean
}

/**
 * 온보딩이 보여줄 언어 목록. 정본은 기관 설정(`GET /api/admin/settings`)이고,
 * 조회에 실패하면 i18n 리소스 기준 목록으로 떨어진다 — 언어를 못 고르는
 * 막다른 길을 만들지 않는다(S02 / F02).
 */
export function useLanguageOptions(role: ParticipantRole): LanguageOptions {
  const query = useQuery({
    // 관리자 화면(S14)이 저장 후 invalidate 하는 키와 반드시 같아야 한다
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    queryFn: fetchAdminSettings,
    retry: 1,
    staleTime: 60_000,
  })
  const settings = query.data ?? null
  return {
    options: role === 'patient' ? selectPatientLangs(settings) : selectStaffLangs(settings),
    loading: query.isPending,
    fallback: settings === null,
  }
}
