import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sessionListSchema, sessionStatusSchema, type SessionStatus } from '@thegame/realtime/http'
import { keynote } from '../data/keynote'
import {
  openSse,
  requestJson,
  sleep,
  startTestServer,
  waitUntil,
  type SseClient,
  type TestServer,
} from './helpers'

const FAST_TIMING = {
  partialIntervalMs: 30,
  translationDelayMs: 30,
  sentenceGapMs: 30,
  heartbeatIntervalMs: 60_000,
}
/** 재생 중이었다면 자막 여러 개가 지나갔을 만큼의 여유 */
const PAUSE_SETTLE_MS = 250

describe('세션 라이프사이클 API (S13)', () => {
  let server: TestServer
  const streams: SseClient[] = []

  beforeEach(async () => {
    server = await startTestServer({ timing: FAST_TIMING })
  })

  afterEach(async () => {
    for (const stream of streams.splice(0)) stream.close()
    await server.close()
  })

  const status = async (id: string): Promise<SessionStatus> => {
    const response = await requestJson(`${server.baseUrl}/api/sessions/${id}/status`)
    expect(response.status).toBe(200)
    return sessionStatusSchema.parse(response.body)
  }

  const control = async (id: string, action: string) =>
    requestJson(`${server.baseUrl}/api/sessions/${id}/${action}`, { method: 'POST' })

  it('부팅 시 keynote 세션이 대기 상태로 시드된다 — 자동 재생은 하지 않는다', async () => {
    const response = await requestJson(`${server.baseUrl}/api/sessions`)
    expect(response.status).toBe(200)

    const list = sessionListSchema.parse(response.body)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: keynote.id, state: 'waiting', viewerCount: 0 })

    // 잠시 기다려도 대기 상태 그대로여야 한다 (부팅 자동 재생 제거 확인)
    await sleep(150)
    expect((await status(keynote.id)).state).toBe('waiting')
  })

  it('POST /api/sessions가 템플릿을 복제해 대기 세션을 만든다', async () => {
    const created = await requestJson(`${server.baseUrl}/api/sessions`, {
      method: 'POST',
      body: { title: '패널 토의', speaker: '박지훈', sourceLang: 'ko', targetLangs: ['en', 'ja'] },
    })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({
      title: '패널 토의',
      speaker: '박지훈',
      sourceLang: 'ko',
      targetLangs: ['en', 'ja'],
      state: 'waiting',
      viewerCount: 0,
    })

    const id = (created.body as { id: string }).id
    expect(id).toMatch(/^[A-Z0-9]{6}$/)

    const list = sessionListSchema.parse(
      (await requestJson(`${server.baseUrl}/api/sessions`)).body,
    )
    expect(list.map((session) => session.id)).toContain(id)
    expect((await status(id)).total).toBe(keynote.sentences.length)
  })

  it('잘못된 생성 요청을 이유와 함께 거절한다', async () => {
    const missingTitle = await requestJson(`${server.baseUrl}/api/sessions`, {
      method: 'POST',
      body: { title: '  ', speaker: '박지훈', sourceLang: 'ko', targetLangs: ['en'] },
    })
    expect(missingTitle.status).toBe(400)
    expect(missingTitle.body).toMatchObject({ error: 'invalid-body' })

    const unknownLang = await requestJson(`${server.baseUrl}/api/sessions`, {
      method: 'POST',
      body: { title: '세션', speaker: '박지훈', sourceLang: 'ko', targetLangs: ['fr'] },
    })
    expect(unknownLang.status).toBe(400)
    expect(unknownLang.body).toMatchObject({ error: 'unsupported-language' })

    const sourceInTargets = await requestJson(`${server.baseUrl}/api/sessions`, {
      method: 'POST',
      body: { title: '세션', speaker: '박지훈', sourceLang: 'ko', targetLangs: ['ko'] },
    })
    expect(sourceInTargets.status).toBe(400)
    expect(sourceInTargets.body).toMatchObject({ error: 'unsupported-language' })
  })

  it('대기 → 재생 → 일시정지 → 재생 → 종료 전이를 허용한다', async () => {
    expect((await status(keynote.id)).state).toBe('waiting')

    const started = await control(keynote.id, 'start')
    expect(started.status).toBe(200)
    expect(sessionStatusSchema.parse(started.body).state).toBe('playing')

    expect((await control(keynote.id, 'pause')).status).toBe(200)
    expect((await status(keynote.id)).state).toBe('paused')

    expect((await control(keynote.id, 'resume')).status).toBe(200)
    expect((await status(keynote.id)).state).toBe('playing')

    const ended = await control(keynote.id, 'end')
    expect(ended.status).toBe(200)
    expect(sessionStatusSchema.parse(ended.body).state).toBe('ended')
  })

  it('허용되지 않은 전이는 409로 거절한다', async () => {
    // 대기 상태에서는 pause·resume 불가
    expect((await control(keynote.id, 'pause')).status).toBe(409)
    expect((await control(keynote.id, 'resume')).status).toBe(409)

    await control(keynote.id, 'start')
    const restarted = await control(keynote.id, 'start')
    expect(restarted.status).toBe(409)
    expect(restarted.body).toMatchObject({ error: 'invalid-transition' })

    // 재생 중에는 resume 불가
    expect((await control(keynote.id, 'resume')).status).toBe(409)
  })

  it('종료된 세션은 어떤 조작도 받지 않는다', async () => {
    await control(keynote.id, 'start')
    await control(keynote.id, 'end')

    for (const action of ['start', 'pause', 'resume', 'end']) {
      const response = await control(keynote.id, action)
      expect(response.status, `${action} after end`).toBe(409)
      expect(response.body).toMatchObject({ error: 'invalid-transition' })
    }

    const rate = await requestJson(`${server.baseUrl}/api/sessions/${keynote.id}/rate`, {
      method: 'POST',
      body: { rate: 1.5 },
    })
    expect(rate.status).toBe(409)
    expect(rate.body).toMatchObject({ error: 'invalid-transition' })
  })

  it('rate 경계값을 지킨다 (0.5–2)', async () => {
    for (const value of [0.5, 1, 2]) {
      const response = await requestJson(`${server.baseUrl}/api/sessions/${keynote.id}/rate`, {
        method: 'POST',
        body: { rate: value },
      })
      expect(response.status, `rate ${value}`).toBe(200)
      expect(sessionStatusSchema.parse(response.body).rate).toBe(value)
    }

    for (const value of [0.49, 2.01, 0, -1, '1.5']) {
      const response = await requestJson(`${server.baseUrl}/api/sessions/${keynote.id}/rate`, {
        method: 'POST',
        body: { rate: value },
      })
      expect(response.status, `rate ${String(value)}`).toBe(400)
      expect(response.body).toMatchObject({ error: 'invalid-rate' })
    }

    expect((await status(keynote.id)).rate).toBe(2)
  })

  it('없는 세션은 404를 준다', async () => {
    const response = await control('nope-99', 'start')
    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({ error: 'not-found' })
  })
})

describe('세션 SSE 스트림 (S13)', () => {
  let server: TestServer
  const streams: SseClient[] = []

  beforeEach(async () => {
    server = await startTestServer({ timing: FAST_TIMING })
  })

  afterEach(async () => {
    for (const stream of streams.splice(0)) stream.close()
    await server.close()
  })

  async function subscribe(lang = 'en'): Promise<SseClient> {
    const stream = await openSse(`${server.baseUrl}/api/sessions/${keynote.id}/stream?lang=${lang}`)
    streams.push(stream)
    return stream
  }

  const control = (action: string) =>
    requestJson(`${server.baseUrl}/api/sessions/${keynote.id}/${action}`, { method: 'POST' })

  it('대기 중에는 세션 메타만 오고 자막은 흐르지 않는다', async () => {
    const stream = await subscribe()
    await stream.waitFor((event) => event.type === 'session', 'session meta')
    await sleep(150)
    expect(stream.events.filter((event) => event.type === 'caption')).toHaveLength(0)
  })

  it('구독자 수가 status에 반영된다', async () => {
    await subscribe()
    await subscribe()
    const response = await requestJson(`${server.baseUrl}/api/sessions/${keynote.id}/status`)
    expect(sessionStatusSchema.parse(response.body).viewerCount).toBe(2)
  })

  it('start 후 부분 자막 → 원문 확정 → 번역 확정 순으로 흐른다', async () => {
    const stream = await subscribe('en')
    await control('start')

    const partial = await stream.waitFor(
      (event) => event.type === 'caption' && !event.isFinal,
      'partial caption',
    )
    if (partial.type !== 'caption') throw new Error('expected caption')
    expect(partial.lang).toBe('ko')

    const sourceFinal = await stream.waitFor(
      (event) => event.type === 'caption' && event.isFinal && event.lang === 'ko',
      'source final',
    )
    if (sourceFinal.type !== 'caption') throw new Error('expected caption')
    expect(sourceFinal.text).toBe(keynote.sentences[0]?.texts.ko)

    const translated = await stream.waitFor(
      (event) => event.type === 'caption' && event.isFinal && event.lang === 'en',
      'translated final',
    )
    if (translated.type !== 'caption') throw new Error('expected caption')
    expect(translated.text).toBe(keynote.sentences[0]?.texts.en)

    // lang=en 구독자에게 ja/zh 자막은 가지 않는다
    expect(stream.events.some((event) => event.type === 'caption' && event.lang === 'ja')).toBe(false)
  })

  it('일시정지 중에는 새 이벤트가 발행되지 않고, 재개하면 이어진다', async () => {
    const stream = await subscribe()
    await control('start')
    await stream.waitFor((event) => event.type === 'caption', 'first caption')

    await control('pause')
    // 일시정지 명령 직전에 스케줄된 한 걸음이 도착할 수 있어 잠깐 가라앉힌 뒤 기준을 잡는다
    await sleep(50)
    const frozen = stream.events.length
    await sleep(PAUSE_SETTLE_MS)
    expect(stream.events).toHaveLength(frozen)

    await control('resume')
    await waitUntil(() => stream.events.length > frozen, 'caption after resume')
  })

  it('end 하면 session-ended가 브로드캐스트된다', async () => {
    const stream = await subscribe()
    await control('start')
    await stream.waitFor((event) => event.type === 'caption', 'first caption')

    await control('end')
    const ended = await stream.waitFor((event) => event.type === 'session-ended', 'session-ended')
    if (ended.type !== 'session-ended') throw new Error('expected session-ended')
    expect(ended.sessionId).toBe(keynote.id)
  })

  it('이미 종료된 세션에 늦게 붙어도 종료 사실을 받는다', async () => {
    await control('start')
    await control('end')

    const stream = await subscribe()
    await stream.waitFor((event) => event.type === 'session-ended', 'session-ended on late join')
  })
})
