import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConnectionStatus } from '../connection'
import type { RealtimeError } from '../errors'
import { CaptionStream, type EventSourceLike } from '../sse'
import type { CaptionEvent } from '../types'

class FakeEventSource implements EventSourceLike {
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string; lastEventId: string }) => void) | null = null
  onerror: (() => void) | null = null
  closed = false

  constructor(readonly url: string) {}

  close(): void {
    this.closed = true
  }
}

const captionJson = JSON.stringify({
  type: 'caption',
  id: 'c1',
  seq: 1,
  lang: 'ko',
  text: '안녕하세요',
  isFinal: true,
})

describe('CaptionStream', () => {
  let sources: FakeEventSource[] = []

  const createEventSource = (url: string): FakeEventSource => {
    const source = new FakeEventSource(url)
    sources.push(source)
    return source
  }

  const lastSource = (): FakeEventSource => {
    const source = sources.at(-1)
    if (!source) throw new Error('no EventSource created yet')
    return source
  }

  beforeEach(() => {
    sources = []
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('연결 후 수신한 이벤트를 onEvent로 전달한다', () => {
    const events: CaptionEvent[] = []
    const stream = new CaptionStream({
      url: 'http://test/stream',
      onEvent: (event) => events.push(event),
      createEventSource,
    })
    stream.connect()
    expect(stream.status).toEqual({ state: 'connecting', attempt: 0 })

    lastSource().onopen?.()
    expect(stream.status).toEqual({ state: 'open' })

    lastSource().onmessage?.({ data: captionJson, lastEventId: '1' })
    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('caption')
  })

  it('오류 시 backoff 후 lastEventId 쿼리를 붙여 재연결한다', () => {
    const statuses: ConnectionStatus[] = []
    const stream = new CaptionStream({
      url: 'http://test/stream',
      onEvent: () => {},
      onStatus: (status) => statuses.push(status),
      createEventSource,
      backoff: { initialDelayMs: 1000, jitter: false },
    })
    stream.connect()
    lastSource().onopen?.()
    lastSource().onmessage?.({ data: captionJson, lastEventId: '7' })

    lastSource().onerror?.()
    expect(stream.status).toEqual({ state: 'reconnecting', attempt: 1, delayMs: 1000 })
    expect(lastSource().closed).toBe(true)
    expect(sources).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    expect(sources).toHaveLength(2)
    expect(lastSource().url).toContain('lastEventId=7')
  })

  it('maxRetries 소진 시 retry-exhausted로 닫힌다', () => {
    const errors: RealtimeError[] = []
    const stream = new CaptionStream({
      url: 'http://test/stream',
      onEvent: () => {},
      onError: (error) => errors.push(error),
      createEventSource,
      maxRetries: 1,
      backoff: { initialDelayMs: 10, jitter: false },
    })
    stream.connect()
    lastSource().onerror?.()
    vi.advanceTimersByTime(10)
    lastSource().onerror?.()

    expect(stream.status).toEqual({ state: 'closed', reason: 'retry-exhausted' })
    expect(errors.at(-1)?.code).toBe('retry-exhausted')
  })

  it('close() 후에는 재연결하지 않는다', () => {
    const stream = new CaptionStream({
      url: 'http://test/stream',
      onEvent: () => {},
      createEventSource,
    })
    stream.connect()
    stream.close()
    lastSource().onerror?.()
    vi.runAllTimers()

    expect(sources).toHaveLength(1)
    expect(stream.status).toEqual({ state: 'closed', reason: 'manual' })
  })

  it('잘못된 페이로드는 onEvent 대신 onError로 전달한다', () => {
    const events: CaptionEvent[] = []
    const errors: RealtimeError[] = []
    const stream = new CaptionStream({
      url: 'http://test/stream',
      onEvent: (event) => events.push(event),
      onError: (error) => errors.push(error),
      createEventSource,
    })
    stream.connect()
    lastSource().onopen?.()
    lastSource().onmessage?.({ data: '{"type":"caption"}', lastEventId: '' })

    expect(events).toHaveLength(0)
    expect(errors[0]?.code).toBe('invalid-payload')
  })
})
