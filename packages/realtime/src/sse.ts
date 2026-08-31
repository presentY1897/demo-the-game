import { backoffDelayMs, type BackoffOptions } from './backoff'
import type { ConnectionStatus } from './connection'
import { RealtimeError } from './errors'
import { parseCaptionEvent, type CaptionEvent } from './types'

export interface EventSourceLike {
  onopen: (() => void) | null
  onmessage: ((event: { data: string; lastEventId: string }) => void) | null
  onerror: (() => void) | null
  close(): void
}

/** RN 등 EventSource가 없는 플랫폼은 폴리필 팩토리를 주입한다 (ADR-0003) */
export type EventSourceFactory = (url: string) => EventSourceLike

export interface CaptionStreamOptions {
  url: string
  onEvent: (event: CaptionEvent) => void
  onStatus?: (status: ConnectionStatus) => void
  onError?: (error: RealtimeError) => void
  createEventSource?: EventSourceFactory
  backoff?: BackoffOptions
  maxRetries?: number
}

const defaultEventSourceFactory: EventSourceFactory = (url) => {
  if (typeof EventSource === 'undefined') {
    throw new RealtimeError(
      'connection-failed',
      'No EventSource in this environment — inject createEventSource',
    )
  }
  // 사용 범위(핸들러 할당·close)는 호환되지만, 네이티브 핸들러의 this/Event 인자
  // 시그니처 때문에 구조적 서브타이핑이 실패해 경계에서 단언한다
  return new EventSource(url) as unknown as EventSourceLike
}

function withQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}${key}=${encodeURIComponent(value)}`
}

export class CaptionStream {
  #options: CaptionStreamOptions
  #source: EventSourceLike | null = null
  #status: ConnectionStatus = { state: 'idle' }
  #attempt = 0
  #lastEventId = ''
  #retryTimer: ReturnType<typeof setTimeout> | null = null
  #closedByUser = false

  constructor(options: CaptionStreamOptions) {
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

  close(): void {
    this.#closedByUser = true
    if (this.#retryTimer !== null) clearTimeout(this.#retryTimer)
    this.#source?.close()
    this.#source = null
    this.#setStatus({ state: 'closed', reason: 'manual' })
  }

  #open(): void {
    const { url, createEventSource = defaultEventSourceFactory } = this.#options
    // EventSource는 수동 재연결 시 Last-Event-ID 헤더를 지정할 수 없어 쿼리로 전달한다
    const target = this.#lastEventId === '' ? url : withQueryParam(url, 'lastEventId', this.#lastEventId)

    let source: EventSourceLike
    try {
      source = createEventSource(target)
    } catch (cause) {
      this.#options.onError?.(
        cause instanceof RealtimeError
          ? cause
          : new RealtimeError('connection-failed', 'Failed to create EventSource', { cause }),
      )
      this.#setStatus({ state: 'closed', reason: 'retry-exhausted' })
      return
    }

    source.onopen = () => {
      this.#attempt = 0
      this.#setStatus({ state: 'open' })
    }
    source.onmessage = ({ data, lastEventId }) => {
      if (lastEventId !== '') this.#lastEventId = lastEventId
      const result = parseCaptionEvent(data)
      if (result.ok) this.#options.onEvent(result.event)
      else this.#options.onError?.(result.error)
    }
    // 브라우저 EventSource의 자동 재연결 대신 직접 backoff로 제어한다 (즉시 close)
    source.onerror = () => {
      source.close()
      this.#scheduleReconnect()
    }
    this.#source = source
  }

  #scheduleReconnect(): void {
    if (this.#closedByUser) return
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
