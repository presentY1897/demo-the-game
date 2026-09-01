import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConnectionStatus } from '../connection'
import type { ClientCommand } from '../types'
import { ConversationSocket, type WebSocketLike } from '../ws'

class FakeWebSocket implements WebSocketLike {
  onopen: (() => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  readonly sent: string[] = []
  closed = false

  constructor(readonly url: string) {}

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
  }
}

const join: ClientCommand = { type: 'join', roomId: 'r1', role: 'staff', lang: 'ko' }
const say = (text: string): ClientCommand => ({ type: 'say', text })

/** 큐에 담기는 건 직렬화된 문자열이라, 비교도 같은 형태로 한다 */
const wire = (command: ClientCommand): string => JSON.stringify(command)

describe('ConversationSocket 오프라인 전송 큐', () => {
  let sockets: FakeWebSocket[] = []

  const createWebSocket = (url: string): FakeWebSocket => {
    const socket = new FakeWebSocket(url)
    sockets.push(socket)
    return socket
  }

  const lastSocket = (): FakeWebSocket => {
    const socket = sockets.at(-1)
    if (!socket) throw new Error('no WebSocket created yet')
    return socket
  }

  /** 테스트 대상 소켓 — backoff는 결정적으로 고정한다 */
  const createSocket = (onStatus?: (status: ConnectionStatus) => void): ConversationSocket =>
    new ConversationSocket({
      url: 'ws://test/conversation',
      onEvent: () => {},
      onStatus,
      createWebSocket,
      backoff: { initialDelayMs: 1000, factor: 2, jitter: false },
    })

  beforeEach(() => {
    sockets = []
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('연결이 열리기 전에 보낸 명령은 open 직후 순서대로 flush된다', () => {
    const socket = createSocket()
    socket.connect()

    // connecting 상태 — 아직 아무것도 나가면 안 된다
    socket.send(join)
    socket.send(say('첫 번째'))
    expect(lastSocket().sent).toEqual([])

    lastSocket().onopen?.()
    expect(lastSocket().sent).toEqual([wire(join), wire(say('첫 번째'))])
  })

  it('끊김 중 쌓인 명령을 재연결 시 순서대로 flush한다', () => {
    const socket = createSocket()
    socket.connect()
    lastSocket().onopen?.()

    socket.send(join)
    const first = lastSocket()
    expect(first.sent).toEqual([wire(join)])

    // 네트워크 끊김
    first.onclose?.()
    expect(socket.status).toEqual({ state: 'reconnecting', attempt: 1, delayMs: 1000 })

    // 끊긴 동안의 입력은 큐로 — 죽은 소켓으로 새어나가지 않는다
    socket.send(say('둘'))
    socket.send(say('셋'))
    socket.send(say('넷'))
    expect(first.sent).toEqual([wire(join)])
    expect(sockets).toHaveLength(1)

    // backoff 후 새 소켓 생성 — 아직 open 전이므로 전송은 없다
    vi.advanceTimersByTime(1000)
    expect(sockets).toHaveLength(2)
    const second = lastSocket()
    expect(second.sent).toEqual([])

    second.onopen?.()
    expect(second.sent).toEqual([wire(say('둘')), wire(say('셋')), wire(say('넷'))])
  })

  it('flush한 명령은 다음 재연결에서 다시 보내지 않는다 (중복 전송 없음)', () => {
    const socket = createSocket()
    socket.connect()
    lastSocket().onopen?.()

    lastSocket().onclose?.()
    socket.send(say('한 번만'))

    vi.advanceTimersByTime(1000)
    const second = lastSocket()
    second.onopen?.()
    expect(second.sent).toEqual([wire(say('한 번만'))])

    // 두 번째 끊김 — 큐는 이미 비었으므로 재연결해도 아무것도 나가지 않는다
    second.onclose?.()
    vi.advanceTimersByTime(1000)
    const third = lastSocket()
    third.onopen?.()

    expect(sockets).toHaveLength(3)
    expect(third.sent).toEqual([])
    expect(second.sent).toEqual([wire(say('한 번만'))])
    // 전체 소켓을 통틀어 정확히 한 번
    expect(sockets.flatMap((s) => s.sent).filter((d) => d === wire(say('한 번만')))).toHaveLength(1)
  })

  it('재연결 대기 중 여러 번 send해도 소켓이 열릴 때 한 번씩만 나간다', () => {
    const socket = createSocket()
    socket.connect()
    lastSocket().onopen?.()
    lastSocket().onclose?.()

    const queued = ['a', 'b', 'c', 'd', 'e']
    for (const text of queued) socket.send(say(text))

    // 재연결 타이머가 도는 도중에도 전송은 일어나지 않는다
    vi.advanceTimersByTime(500)
    expect(sockets.flatMap((s) => s.sent)).toEqual([])

    vi.advanceTimersByTime(500)
    lastSocket().onopen?.()

    expect(lastSocket().sent).toEqual(queued.map((text) => wire(say(text))))
    expect(sockets.flatMap((s) => s.sent)).toHaveLength(queued.length)
  })

  it('열려 있으면 큐를 거치지 않고 즉시 전송한다', () => {
    const socket = createSocket()
    socket.connect()
    lastSocket().onopen?.()

    socket.send(say('즉시'))
    expect(lastSocket().sent).toEqual([wire(say('즉시'))])

    // 큐가 비어 있으므로 끊고 다시 열어도 재전송되지 않는다
    lastSocket().onclose?.()
    vi.advanceTimersByTime(1000)
    lastSocket().onopen?.()
    expect(lastSocket().sent).toEqual([])
  })

  it('재연결이 backoff만큼 늘어나도 큐 순서는 유지된다', () => {
    const statuses: ConnectionStatus[] = []
    const socket = createSocket((status) => statuses.push(status))
    socket.connect()
    lastSocket().onopen?.()
    lastSocket().onclose?.()

    socket.send(say('1'))

    // 1차 재연결 시도가 곧바로 닫히면 지연이 2배로 늘어난다
    vi.advanceTimersByTime(1000)
    lastSocket().onclose?.()
    expect(socket.status).toEqual({ state: 'reconnecting', attempt: 2, delayMs: 2000 })

    socket.send(say('2'))

    vi.advanceTimersByTime(2000)
    const opened = lastSocket()
    opened.onopen?.()

    expect(opened.sent).toEqual([wire(say('1')), wire(say('2'))])
    expect(statuses.map((s) => s.state)).toEqual([
      'connecting',
      'open',
      'reconnecting',
      'reconnecting',
      'open',
    ])
  })

  it('close() 이후의 send는 큐에만 남고 재연결도 하지 않는다', () => {
    const socket = createSocket()
    socket.connect()
    lastSocket().onopen?.()
    socket.close()

    socket.send(say('보내지 않음'))
    vi.runAllTimers()

    expect(sockets).toHaveLength(1)
    expect(sockets[0]?.sent).toEqual([])
    expect(sockets[0]?.closed).toBe(true)
    expect(socket.status).toEqual({ state: 'closed', reason: 'manual' })
  })
})
