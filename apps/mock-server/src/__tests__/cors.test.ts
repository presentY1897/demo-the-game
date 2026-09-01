import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { createCorsPolicy, parseAllowedOrigins } from '../cors'
import { startTestServer, type TestServer } from './helpers'

const DEPLOY = 'https://thegame-live-demo.vercel.app'
const PRODUCT = 'https://thegame-product.vercel.app'
const EVIL = 'https://evil.example.com'

let server: TestServer | undefined

afterEach(async () => {
  await server?.close()
  server = undefined
  vi.restoreAllMocks()
})

describe('오리진 목록 파싱', () => {
  it('쉼표·공백·줄바꿈 아무거나로 구분하고 중복·트레일링 슬래시를 지운다', () => {
    expect(parseAllowedOrigins(`${DEPLOY}/, ${PRODUCT}\n${DEPLOY}`)).toEqual([DEPLOY, PRODUCT])
  })

  it('빈 문자열은 목록이 아니다', () => {
    expect(parseAllowedOrigins('   ')).toEqual([])
    expect(parseAllowedOrigins(undefined)).toEqual([])
  })
})

describe('정책', () => {
  it('미설정이면 예전처럼 * — 저장소 클론만으로 돌아가는 조건', () => {
    const policy = createCorsPolicy(undefined)
    expect(policy.allowAll).toBe(true)
    expect(policy.allowOriginFor(EVIL)).toBe('*')
    expect(policy.isAllowed(EVIL)).toBe(true)
  })

  it('목록에 `*`가 있으면 명시적 전체 허용', () => {
    expect(createCorsPolicy('*').allowAll).toBe(true)
  })

  it('목록이 있으면 목록에 있는 오리진만 그대로 되돌려준다', () => {
    const policy = createCorsPolicy(`${DEPLOY},${PRODUCT}`)
    expect(policy.allowAll).toBe(false)
    expect(policy.allowOriginFor(DEPLOY)).toBe(DEPLOY)
    expect(policy.allowOriginFor(EVIL)).toBeNull()
  })

  it('Origin 없는 요청(curl·네이티브 앱)은 막지 않는다 — 헤더만 안 붙는다', () => {
    const policy = createCorsPolicy(DEPLOY)
    expect(policy.isAllowed(undefined)).toBe(true)
    expect(policy.allowOriginFor(undefined)).toBeNull()
  })

  it('`*` 와일드카드는 점을 넘지 않는 한 조각에만 대응한다 (Vercel 프리뷰 도메인용)', () => {
    const policy = createCorsPolicy('https://*.vercel.app')
    expect(policy.allowOriginFor('https://demo-git-feat-abc.vercel.app')).toBe(
      'https://demo-git-feat-abc.vercel.app',
    )
    expect(policy.allowOriginFor('https://a.b.vercel.app')).toBeNull()
    expect(policy.allowOriginFor('https://vercel.app.evil.com')).toBeNull()
  })

  it('대소문자·트레일링 슬래시 차이를 흡수한다', () => {
    const policy = createCorsPolicy('HTTPS://Thegame.Vercel.App/')
    expect(policy.allowOriginFor('https://thegame.vercel.app')).toBe('https://thegame.vercel.app')
  })
})

describe('HTTP 응답 헤더', () => {
  it('환경변수를 끄면 모든 오리진에 `*`를 준다', async () => {
    server = await startTestServer()
    const response = await fetch(`${server.baseUrl}/health`, { headers: { Origin: EVIL } })
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(response.headers.get('vary')).toBeNull()
  })

  it('환경변수를 켜면 허용 오리진만 되돌려주고 Vary: Origin을 붙인다', async () => {
    server = await startTestServer({ allowedOrigins: DEPLOY })
    const ok = await fetch(`${server.baseUrl}/health`, { headers: { Origin: DEPLOY } })
    expect(ok.headers.get('access-control-allow-origin')).toBe(DEPLOY)
    expect(ok.headers.get('vary')).toBe('Origin')

    const blocked = await fetch(`${server.baseUrl}/health`, { headers: { Origin: EVIL } })
    // 헤더가 없으면 브라우저가 응답을 스크립트에 넘기지 않는다
    expect(blocked.headers.get('access-control-allow-origin')).toBeNull()
    expect(blocked.status).toBe(200)
  })

  it('프리플라이트(OPTIONS)도 같은 판정을 따른다', async () => {
    server = await startTestServer({ allowedOrigins: DEPLOY })
    const ok = await fetch(`${server.baseUrl}/api/rooms`, {
      method: 'OPTIONS',
      headers: { Origin: DEPLOY, 'Access-Control-Request-Method': 'POST' },
    })
    expect(ok.status).toBe(204)
    expect(ok.headers.get('access-control-allow-origin')).toBe(DEPLOY)
    expect(ok.headers.get('access-control-allow-methods')).toContain('POST')

    const blocked = await fetch(`${server.baseUrl}/api/rooms`, {
      method: 'OPTIONS',
      headers: { Origin: EVIL, 'Access-Control-Request-Method': 'POST' },
    })
    expect(blocked.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('SSE 스트림에도 허용 헤더가 붙는다 — 자막이 CORS로 막히면 데모가 죽는다', async () => {
    server = await startTestServer({ allowedOrigins: DEPLOY })
    const controller = new AbortController()
    const response = await fetch(`${server.baseUrl}/api/sessions/keynote-01/stream?lang=en`, {
      headers: { Origin: DEPLOY },
      signal: controller.signal,
    })
    expect(response.headers.get('access-control-allow-origin')).toBe(DEPLOY)
    controller.abort()
  })

  it('차단은 무음이 아니다 — 경고 로그가 남는다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    server = await startTestServer({ allowedOrigins: DEPLOY })
    await fetch(`${server.baseUrl}/health`, { headers: { Origin: EVIL } })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(EVIL))
  })
})

describe('WebSocket 핸드셰이크', () => {
  async function connect(url: string, origin?: string): Promise<'open' | 'rejected'> {
    const socket = new WebSocket(url, origin === undefined ? {} : { origin })
    return await new Promise((resolve) => {
      socket.once('open', () => {
        socket.close()
        resolve('open')
      })
      socket.once('error', () => resolve('rejected'))
    })
  }

  it('환경변수를 끄면 어떤 오리진이든 붙는다', async () => {
    server = await startTestServer()
    expect(await connect(server.wsUrl, EVIL)).toBe('open')
  })

  it('환경변수를 켜면 허용 오리진만 붙고 나머지는 핸드셰이크에서 거절된다', async () => {
    server = await startTestServer({ allowedOrigins: DEPLOY })
    expect(await connect(server.wsUrl, DEPLOY)).toBe('open')
    expect(await connect(server.wsUrl, EVIL)).toBe('rejected')
  })

  it('Origin 없는 클라이언트(Expo 네이티브 앱)는 계속 붙는다', async () => {
    server = await startTestServer({ allowedOrigins: DEPLOY })
    expect(await connect(server.wsUrl)).toBe('open')
  })
})
