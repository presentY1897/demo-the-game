import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { AdminSettings } from '@thegame/realtime'
import { ADMIN_SETTINGS_QUERY_KEY } from '../../../api/adminKeys'
import { selectPatientLangs } from '../../../stores/languageSelectors'
import { publishSavedSettings } from '../settingsCache'

const before: AdminSettings = {
  patientLangs: ['en', 'ja', 'zh'],
  supportedLangs: ['en', 'ja', 'zh', 'vi', 'ru', 'mn'],
}
const after: AdminSettings = { ...before, patientLangs: ['en', 'vi'] }

/** 온보딩(`useLanguageOptions`)이 쓰는 조건 그대로 — staleTime 60초 */
async function seedOnboardingQuery(client: QueryClient, value: AdminSettings): Promise<void> {
  await client.fetchQuery({
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    queryFn: () => Promise.resolve(value),
    staleTime: 60_000,
  })
}

describe('publishSavedSettings (S14 완성 기준 2)', () => {
  it('저장한 설정이 온보딩이 읽는 캐시에 그대로 들어간다', async () => {
    const client = new QueryClient()
    await seedOnboardingQuery(client, before)
    expect(selectPatientLangs(client.getQueryData<AdminSettings>(ADMIN_SETTINGS_QUERY_KEY))).toEqual([
      'en',
      'ja',
      'zh',
    ])

    await publishSavedSettings(client, after)

    // 온보딩은 이 데이터를 그대로 언어 목록으로 쓴다 — 껐던 ja·zh가 사라진다
    expect(selectPatientLangs(client.getQueryData<AdminSettings>(ADMIN_SETTINGS_QUERY_KEY))).toEqual([
      'en',
      'vi',
    ])
  })

  it('staleTime 60초를 넘어 다시 받아오게 무효화한다 — 켜져 있는 온보딩도 따라온다', async () => {
    const client = new QueryClient()
    await seedOnboardingQuery(client, before)
    expect(client.getQueryState(ADMIN_SETTINGS_QUERY_KEY)?.isInvalidated).toBe(false)

    await publishSavedSettings(client, after)

    expect(client.getQueryState(ADMIN_SETTINGS_QUERY_KEY)?.isInvalidated).toBe(true)
  })

  it('무효화 뒤 온보딩이 다시 조회하면 서버의 새 목록을 읽는다', async () => {
    const client = new QueryClient()
    await seedOnboardingQuery(client, before)
    await publishSavedSettings(client, after)

    const queryFn = vi.fn(() => Promise.resolve(after))
    const refetched = await client.fetchQuery({
      queryKey: ADMIN_SETTINGS_QUERY_KEY,
      queryFn,
      staleTime: 60_000,
    })

    // 무효화가 없었다면 staleTime 때문에 queryFn을 부르지 않고 옛 값을 돌려줬을 것이다
    expect(queryFn).toHaveBeenCalledTimes(1)
    expect(selectPatientLangs(refetched)).toEqual(['en', 'vi'])
  })

  it('설정을 못 읽는 상황에서도 온보딩은 폴백 목록으로 버틴다', () => {
    const client = new QueryClient()
    expect(client.getQueryData<AdminSettings>(ADMIN_SETTINGS_QUERY_KEY)).toBeUndefined()
    expect(selectPatientLangs(client.getQueryData<AdminSettings>(ADMIN_SETTINGS_QUERY_KEY)).length)
      .toBeGreaterThan(0)
  })
})

describe('쿼리 키', () => {
  it('온보딩이 조회하는 키와 관리자가 무효화하는 키는 같다', () => {
    // hooks/useLanguageOptions가 이 상수를 그대로 쓴다 — 문자열이 갈라지면 여기서 깨진다
    expect(ADMIN_SETTINGS_QUERY_KEY).toEqual(['admin-settings'])
  })
})
