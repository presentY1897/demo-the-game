import { backoffDelayMs, type BackoffOptions } from './backoff'
import type { ConnectionStatus } from './connection'
import { RealtimeError } from './errors'
import { parseConversationEvent, type ClientCommand, type ConversationEvent } from './types'

export interface WebSocketLike {
  onopen: (() => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: (() => void) | null
  onerror: (() => void) | null
  send(data: string): void
  close(): void
}

export type WebSocketFactory = (url: string) => WebSocketLike

export interface ConversationSocketOptions {
  url: string
  onEvent: (event: ConversationEvent) => void
  onStatus?: (status: ConnectionStatus) => void
  onError?: (error: RealtimeError) => void
  createWebSocket?: WebSocketFactory
  backoff?: BackoffOptions
  maxRetries?: number
}

const defaultWebSocketFactory: WebSocketFactory = (url) => {
  if (typeof WebSocket === 'undefined') {
    throw new RealtimeError(
      'connection-failed',
      'No WebSocket in this environment — inject createWebSocket',
    )
  }
  // 사용 범위(핸들러 할당·send·close)는 호환되지만, 네이티브 핸들러의 this/Event
  // 인자 시그니처 때문에 구조적 서브타이핑이 실패해 경계에서 단언한다
  return new WebSocket(url) as unknown as WebSocketLike
}

export class ConversationSocket {
  #options: ConversationSocketOptions
  #socket: WebSocketLike | null = null
  #status: ConnectionStatus = { state: 'idle' }
  #attempt = 0
  #isOpen = false
  #sendQueue: string[] = []
  #retryTimer: ReturnType<typeof setTimeout> | null = null
  #closedByUser = false

  constructor(options: ConversationSocketOptions) {
    this.#options = options
  }

  get status(): ConnectionStatus {
    return this.#status
  }

  connect(): void {
    this.#closedByUser = false
    this.#attempt = 0
    this.#setStatus({ state: 'connecting', attempt: 0 })
    this.#open()
  }

  /** 연결이 닫혀 있으면 큐에 쌓았다가 재연결 직후 순서대로 flush한다 */
  send(command: ClientCommand): void {
    const data = JSON.stringify(command)
    if (this.#isOpen && this.#socket !== null) this.#socket.send(data)
    else this.#sendQueue.push(data)
  }

  close(): void {
    this.#closedByUser = true
    if (this.#retryTimer !== null) clearTimeout(this.#retryTimer)
    this.#socket?.close()
    this.#socket = null
    this.#isOpen = false
    this.#setStatus({ state: 'closed', reason: 'manual' })
  }

  #open(): void {
    const { url, createWebSocket = defaultWebSocketFactory } = this.#options

    let socket: WebSocketLike
    try {
      socket = createWebSocket(url)
    } catch (cause) {
      this.#options.onError?.(
        cause instanceof RealtimeError
          ? cause
          : new RealtimeError('connection-failed', 'Failed to create WebSocket', { cause }),
      )
      this.#setStatus({ state: 'closed', reason: 'retry-exhausted' })
      return
    }

    socket.onopen = () => {
      this.#attempt = 0
      this.#isOpen = true
      this.#setStatus({ state: 'open' })
      this.#flushQueue()
    }
    socket.onmessage = ({ data }) => {
      const result = parseConversationEvent(typeof data === 'string' ? data : String(data))
      if (result.ok) this.#options.onEvent(result.event)
      else this.#options.onError?.(result.error)
    }
    // 에러 시 onclose가 뒤따르므로 재연결 스케줄링은 onclose에서만 한다 (중복 방지)
    socket.onerror = null
    socket.onclose = () => {
      this.#isOpen = false
      if (!this.#closedByUser) this.#scheduleReconnect()
    }
    this.#socket = socket
  }

  #flushQueue(): void {
    const socket = this.#socket
    if (socket === null) return
    while (this.#sendQueue.length > 0) {
      const data = this.#sendQueue.shift()
      if (data !== undefined) socket.send(data)
    }
  }

  #scheduleReconnect(): void {
    const maxRetries = this.#options.maxRetries ?? 8
    if (this.#attempt >= maxRetries) {
      this.#setStatus({ state: 'closed', reason: 'retry-exhausted' })
      this.#options.onError?.(
        new RealtimeError('retry-exhausted', `Gave up after ${maxRetries} reconnect attempts`),
      )
      return
    }
    const delayMs = backoffDelayMs(this.#attempt, this.#options.backoff)
    this.#attempt += 1
    this.#setStatus({ state: 'reconnecting', attempt: this.#attempt, delayMs })
    this.#retryTimer = setTimeout(() => this.#open(), delayMs)
  }

  #setStatus(status: ConnectionStatus): void {
    this.#status = status
    this.#options.onStatus?.(status)
  }
}
