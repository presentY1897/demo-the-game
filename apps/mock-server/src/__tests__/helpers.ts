import type { AddressInfo } from 'node:net'
import { WebSocket } from 'ws'
import { parseCaptionEvent, parseConversationEvent } from '@thegame/realtime/types'
import type { CaptionEvent, ClientCommand, ConversationEvent } from '@thegame/realtime/types'
import { createMockServer, type MockServer, type MockServerOptions } from '../app'

const DEFAULT_WAIT_MS = 3000

interface Waiter<T> {
  predicate: (event: T) => boolean
  resolve: (event: T) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
  label: string
}

/**
 * 이벤트 수집기 — 이미 받은 것과 앞으로 올 것을 함께 기다린다.
 * 타임아웃 시 지금까지 받은 이벤트를 메시지에 담아 실패를 설명 없이 넘기지 않는다.
 */
class EventCollector<T> {
  readonly events: T[] = []
  readonly #waiters = new Set<Waiter<T>>()

  push(event: T): void {
    this.events.push(event)
    for (const waiter of [...this.#waiters]) {
      if (!waiter.predicate(event)) continue
      clearTimeout(waiter.timer)
      this.#waiters.delete(waiter)
      waiter.resolve(event)
    }
  }

  waitFor(predicate: (event: T) => boolean, label = 'event', timeoutMs = DEFAULT_WAIT_MS): Promise<T> {
    const seen = this.events.find(predicate)
    if (seen) return Promise.resolve(seen)
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#waiters.delete(waiter)
        reject(
          new Error(
            `timed out waiting for ${label} after ${timeoutMs}ms — received: ${JSON.stringify(this.events)}`,
          ),
        )
      }, timeoutMs)
      const waiter: Waiter<T> = { predicate, resolve, reject, timer, label }
      this.#waiters.add(waiter)
    })
  }

  clearWaiters(): void {
    for (const waiter of this.#waiters) clearTimeout(waiter.timer)
    this.#waiters.clear()
  }
}

export interface TestServer {
  mock: MockServer
  baseUrl: string
  wsUrl: string
  close: () => Promise<void>
}

export async function startTestServer(options: MockServerOptions = {}): Promise<TestServer> {
  const mock = createMockServer(options)
  await new Promise<void>((resolve) => {
    mock.server.listen(0, '127.0.0.1', resolve)
  })
  const address = mock.server.address() as AddressInfo
  const authority = `127.0.0.1:${address.port}`
  return {
    mock,
    baseUrl: `http://${authority}`,
    wsUrl: `ws://${authority}/ws/conversation`,
    close: mock.close,
  }
}

export interface JsonResponse {
  status: number
  body: unknown
}

export async function requestJson(
  url: string,
  init: { method?: string; body?: unknown } = {},
): Promise<JsonResponse> {
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    ...(init.body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(init.body) }),
  })
  const text = await response.text()
  return { status: response.status, body: text === '' ? undefined : JSON.parse(text) }
}

export interface SseClient {
  events: CaptionEvent[]
  waitFor: (predicate: (event: CaptionEvent) => boolean, label?: string, timeoutMs?: number) => Promise<CaptionEvent>
  close: () => void
}

/** SSE 스트림을 붙어 읽는다 — 프레임 파싱은 realtime의 parseCaptionEvent에 맡긴다 */
export async function openSse(url: string): Promise<SseClient> {
  const controller = new AbortController()
  const response = await fetch(url, { signal: controller.signal })
  const stream = response.body
  if (!response.ok || !stream) throw new Error(`SSE connect failed: HTTP ${response.status}`)
  const collector = new EventCollector<CaptionEvent>()

  void (async () => {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let separator = buffer.indexOf('\n\n')
        while (separator !== -1) {
          const frame = buffer.slice(0, separator)
          buffer = buffer.slice(separator + 2)
          for (const line of frame.split('\n')) {
            if (!line.startsWith('data:')) continue
            const parsed = parseCaptionEvent(line.slice(5).trim())
            if (parsed.ok) collector.push(parsed.event)
            else throw parsed.error
          }
          separator = buffer.indexOf('\n\n')
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) throw error
    }
  })()

  return {
    events: collector.events,
    waitFor: (predicate, label, timeoutMs) => collector.waitFor(predicate, label ?? 'caption event', timeoutMs),
    close: () => {
      collector.clearWaiters()
      controller.abort()
    },
  }
}

export interface WsClient {
  events: ConversationEvent[]
  send: (command: ClientCommand) => void
  waitFor: (
    predicate: (event: ConversationEvent) => boolean,
    label?: string,
    timeoutMs?: number,
  ) => Promise<ConversationEvent>
  close: () => Promise<void>
}

/** WS 대화 클라이언트 시뮬레이터 — 파싱은 realtime의 parseConversationEvent에 맡긴다 */
export async function openWs(url: string): Promise<WsClient> {
  const socket = new WebSocket(url)
  const collector = new EventCollector<ConversationEvent>()

  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve)
    socket.once('error', reject)
  })

  socket.on('message', (raw) => {
    const parsed = parseConversationEvent(String(raw))
    if (!parsed.ok) throw parsed.error
    collector.push(parsed.event)
  })

  return {
    events: collector.events,
    send: (command) => socket.send(JSON.stringify(command)),
    waitFor: (predicate, label, timeoutMs) =>
      collector.waitFor(predicate, label ?? 'conversation event', timeoutMs),
    close: () =>
      new Promise<void>((resolve) => {
        collector.clearWaiters()
        if (socket.readyState === socket.CLOSED) {
          resolve()
          return
        }
        socket.once('close', () => resolve())
        socket.close()
      }),
  }
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/** 이미 도착한 이벤트가 아니라 "상태가 바뀌는 것"을 기다릴 때 쓴다 */
export async function waitUntil(
  condition: () => boolean,
  label = 'condition',
  timeoutMs = 3000,
  intervalMs = 20,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label} after ${timeoutMs}ms`)
    await sleep(intervalMs)
  }
}
