import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// RN 런타임을 끌어오지 않고 config.ts의 URL 유도만 검사한다 (vitest 환경은 node).
vi.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (options: Record<string, unknown>) => options['web'] ?? options['default'],
  },
}))

/** config.ts는 모듈 최상단에서 값을 굳히므로 케이스마다 다시 import 해야 한다 */
async function loadConfig(env: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, undefined as unknown as string)
    else vi.stubEnv(key, value)
  }
  return await import('../config')
}

const originalWindow = (globalThis as { window?: unknown }).window

beforeEach(() => {
  vi.stubEnv('EXPO_PUBLIC_API_URL', undefined as unknown as string)
  vi.stubEnv('EXPO_PUBLIC_APP_URL', undefined as unknown as string)
})

afterEach(() => {
  vi.unstubAllEnvs()
  if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window
  else (globalThis as { window?: unknown }).window = originalWindow
})

describe('API_BASE / WS_BASE 유도 (S07)', () => {
  it('환경변수가 없으면 로컬 목 서버를 가리킨다', async () => {
    const { API_BASE, WS_BASE } = await loadConfig({})
    expect(API_BASE).toBe('http://localhost:4010')
    expect(WS_BASE).toBe('ws://localhost:4010')
  })

  it('https API 주소는 wss로 유도된다 — 배포에서 혼합 콘텐츠로 막히면 대화가 죽는다', async () => {
    const { API_BASE, WS_BASE } = await loadConfig({
      EXPO_PUBLIC_API_URL: 'https://thegame-mock-server.onrender.com',
    })
    expect(API_BASE).toBe('https://thegame-mock-server.onrender.com')
    expect(WS_BASE).toBe('wss://thegame-mock-server.onrender.com')
  })

  it('트레일링 슬래시를 떼어낸다 — 대시보드 붙여넣기 사고 방지', async () => {
    const { API_BASE, WS_BASE } = await loadConfig({
      EXPO_PUBLIC_API_URL: 'https://thegame-mock-server.onrender.com/',
    })
    expect(API_BASE).toBe('https://thegame-mock-server.onrender.com')
    expect(WS_BASE).toBe('wss://thegame-mock-server.onrender.com')
  })

  it('빈 값으로 등록된 환경변수는 미설정과 같게 본다', async () => {
    const { API_BASE } = await loadConfig({ EXPO_PUBLIC_API_URL: '  ' })
    expect(API_BASE).toBe('http://localhost:4010')
  })
})

describe('APP_ORIGIN 유도 (QR·공유 링크)', () => {
  it('웹에서는 환경변수가 없으면 현재 주소창 origin', async () => {
    ;(globalThis as { window?: unknown }).window = { location: { origin: 'https://preview.vercel.app' } }
    const { APP_ORIGIN } = await loadConfig({})
    expect(APP_ORIGIN).toBe('https://preview.vercel.app')
  })

  it('환경변수가 있으면 그것이 이긴다 (네이티브에는 origin이 없다)', async () => {
    ;(globalThis as { window?: unknown }).window = { location: { origin: 'https://preview.vercel.app' } }
    const { APP_ORIGIN } = await loadConfig({ EXPO_PUBLIC_APP_URL: 'https://thegame-live-demo.vercel.app/' })
    expect(APP_ORIGIN).toBe('https://thegame-live-demo.vercel.app')
  })
})
