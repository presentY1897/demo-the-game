import type { ServerResponse } from 'node:http'
import type { SessionState, SessionStatus } from '@thegame/realtime/http'
import type { CaptionEvent } from '@thegame/realtime/types'
import type { SessionScript } from './data/keynote'

interface SseClient {
  res: ServerResponse
  /** 이 클라이언트에 보낼 자막 언어 (원문 + 선택 언어). 비어 있으면 전체 */
  langs: ReadonlySet<string>
}

interface LoggedEvent {
  seq: number
  event: CaptionEvent
}

/** 재생 한 걸음 — 앞선 지연 후 `run`을 실행한다. 일시정지는 이 큐의 소비를 멈추는 것 */
interface PlaybackStep {
  delayMs: number
  sentenceIndex: number
  run: () => void
}

export interface BroadcasterTiming {
  partialIntervalMs: number
  partialWordsPerTick: number
  translationDelayMs: number
  sentenceGapMs: number
  heartbeatIntervalMs: number
}

export const defaultTiming: BroadcasterTiming = {
  partialIntervalMs: 320,
  partialWordsPerTick: 2,
  translationDelayMs: 400,
  sentenceGapMs: 1400,
  heartbeatIntervalMs: 15_000,
}

const LOG_LIMIT = 500
const CATCH_UP_COUNT = 8
export const MIN_RATE = 0.5
export const MAX_RATE = 2

export type ControlResult =
  | { ok: true }
  | { ok: false; code: 'invalid-transition' | 'invalid-rate'; message: string }

function writeSse(res: ServerResponse, event: CaptionEvent, id?: number): void {
  if (id !== undefined) res.write(`id: ${id}\n`)
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

/**
 * 강연 스크립트를 실시간처럼 재생하는 공유 브로드캐스터.
 * 모든 시청자는 같은 시점을 본다 — 부분 자막(STT 진행) → 원문 확정 →
 * 번역 지연 후 언어별 확정 순서로 흘러간다.
 *
 * 재생은 부팅 시 자동으로 시작하지 않고 운영 콘솔이 제어한다(S13):
 * 대기 → 재생 ⇄ 일시정지 → 종료. 종료된 세션은 어떤 조작도 받지 않는다.
 *
 * SSE `id:`는 확정 이벤트에만 붙인다. 재연결 시 lastEventId 이후의
 * 확정 자막만 복구되고, 휘발성인 부분 자막은 다시 보내지 않는다.
 */
export class SessionBroadcaster {
  readonly #script: SessionScript
  readonly #timing: BroadcasterTiming
  readonly #clients = new Set<SseClient>()
  #log: LoggedEvent[] = []
  #seq = 0
  #state: SessionState = 'waiting'
  #steps: PlaybackStep[] = []
  #cursor = 0
  #rate = 1
  #timer: NodeJS.Timeout | null = null
  #heartbeat: NodeJS.Timeout | null = null

  constructor(script: SessionScript, timing: Partial<BroadcasterTiming> = {}) {
    this.#script = script
    this.#timing = { ...defaultTiming, ...timing }
    // 대기 중인 시청자의 연결도 살아 있어야 하므로 하트비트는 재생과 무관하게 돈다
    this.#heartbeat = setInterval(() => {
      this.#broadcast({ type: 'heartbeat', ts: Date.now() })
    }, this.#timing.heartbeatIntervalMs)
    this.#heartbeat.unref()
  }

  get script(): SessionScript {
    return this.#script
  }

  get state(): SessionState {
    return this.#state
  }

  get viewerCount(): number {
    return this.#clients.size
  }

  get rate(): number {
    return this.#rate
  }

  /** 재생 중인 문장 인덱스(0-based). 스크립트를 끝까지 재생했으면 총 문장 수 */
  get position(): number {
    if (this.#state === 'waiting') return 0
    const step = this.#steps[this.#cursor]
    return step ? step.sentenceIndex : this.#script.sentences.length
  }

  get status(): SessionStatus {
    return {
      state: this.#state,
      viewerCount: this.viewerCount,
      position: this.position,
      total: this.#script.sentences.length,
      rate: this.#rate,
    }
  }

  // ── 라이프사이클 제어 ────────────────────────────────────────────────────

  start(): ControlResult {
    if (this.#state !== 'waiting') return this.#rejectTransition('start')
    this.#steps = this.#buildSteps()
    this.#cursor = 0
    this.#state = 'playing'
    this.#emitLogged(this.#sessionEvent())
    this.#scheduleNext()
    return { ok: true }
  }

  pause(): ControlResult {
    if (this.#state !== 'playing') return this.#rejectTransition('pause')
    this.#clearTimer()
    this.#state = 'paused'
    return { ok: true }
  }

  resume(): ControlResult {
    if (this.#state !== 'paused') return this.#rejectTransition('resume')
    this.#state = 'playing'
    this.#scheduleNext()
    return { ok: true }
  }

  end(): ControlResult {
    if (this.#state === 'ended') return this.#rejectTransition('end')
    this.#clearTimer()
    this.#state = 'ended'
    this.#emitLogged({ type: 'session-ended', sessionId: this.#script.id })
    return { ok: true }
  }

  /** 발표자 속도 제어의 데모 대체 — 다음 걸음부터 반영된다 */
  setRate(rate: number): ControlResult {
    if (this.#state === 'ended') return this.#rejectTransition('rate')
    if (!Number.isFinite(rate) || rate < MIN_RATE || rate > MAX_RATE) {
      return {
        ok: false,
        code: 'invalid-rate',
        message: `rate must be between ${MIN_RATE} and ${MAX_RATE}`,
      }
    }
    this.#rate = rate
    return { ok: true }
  }

  /** 테스트·종료용 — 타이머와 열린 스트림을 모두 정리한다 */
  close(): void {
    this.#clearTimer()
    if (this.#heartbeat) clearInterval(this.#heartbeat)
    this.#heartbeat = null
    for (const client of this.#clients) client.res.end()
    this.#clients.clear()
  }

  // ── 구독 ─────────────────────────────────────────────────────────────────

  handleStream(res: ServerResponse, options: { lang?: string; lastEventId?: number }): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    res.write(': connected\n\n')

    const langs = new Set<string>([this.#script.sourceLang])
    if (options.lang !== undefined && options.lang !== '') langs.add(options.lang)
    else for (const lang of this.#script.targetLangs) langs.add(lang)

    const client: SseClient = { res, langs }

    if (options.lastEventId !== undefined) {
      for (const logged of this.#log) {
        if (logged.seq > options.lastEventId) this.#sendTo(client, logged.event, logged.seq)
      }
    } else {
      this.#sendTo(client, this.#sessionEvent())
      for (const logged of this.#log.slice(-CATCH_UP_COUNT)) {
        this.#sendTo(client, logged.event, logged.seq)
      }
    }

    this.#clients.add(client)
    res.on('close', () => this.#clients.delete(client))
  }

  // ── 재생 엔진 ────────────────────────────────────────────────────────────

  #rejectTransition(action: string): ControlResult {
    return {
      ok: false,
      code: 'invalid-transition',
      message: `cannot ${action} a session in state "${this.#state}"`,
    }
  }

  #clearTimer(): void {
    if (this.#timer) clearTimeout(this.#timer)
    this.#timer = null
  }

  #scheduleNext(): void {
    if (this.#state !== 'playing') return
    const step = this.#steps[this.#cursor]
    if (!step) {
      // 스크립트를 끝까지 재생했다 — 콘솔이 누르지 않아도 종료로 마감한다
      this.end()
      return
    }
    const delay = Math.max(0, Math.round(step.delayMs / this.#rate))
    this.#timer = setTimeout(() => {
      this.#timer = null
      if (this.#state !== 'playing') return
      this.#cursor += 1
      step.run()
      this.#scheduleNext()
    }, delay)
    this.#timer.unref()
  }

  /**
   * 스크립트 전체를 한 번에 걸음 목록으로 펼친다.
   * 걸음 단위라 일시정지·재개가 문장 중간에서도 정확히 이어지고,
   * 속도 변경은 다음 걸음의 지연부터 곧바로 반영된다.
   */
  #buildSteps(): PlaybackStep[] {
    const steps: PlaybackStep[] = []
    const { partialIntervalMs, partialWordsPerTick, translationDelayMs, sentenceGapMs } =
      this.#timing

    this.#script.sentences.forEach((sentence, index) => {
      const sourceText = sentence.texts[this.#script.sourceLang]
      const words = sourceText.split(' ')
      let firstOfSentence = true

      for (let count = partialWordsPerTick; ; count += partialWordsPerTick) {
        const text = words.slice(0, count).join(' ')
        steps.push({
          delayMs: firstOfSentence ? (index === 0 ? 0 : sentenceGapMs) : partialIntervalMs,
          sentenceIndex: index,
          run: () =>
            this.#broadcast({
              type: 'caption',
              id: sentence.id,
              seq: this.#seq + 1,
              lang: this.#script.sourceLang,
              text,
              isFinal: false,
            }),
        })
        firstOfSentence = false
        if (count >= words.length) break
      }

      steps.push({
        delayMs: partialIntervalMs,
        sentenceIndex: index,
        run: () =>
          this.#emitLogged({
            type: 'caption',
            id: sentence.id,
            seq: this.#seq + 1,
            lang: this.#script.sourceLang,
            text: sourceText,
            isFinal: true,
          }),
      })

      steps.push({
        delayMs: translationDelayMs,
        sentenceIndex: index,
        run: () => {
          for (const lang of this.#script.targetLangs) {
            this.#emitLogged({
              type: 'caption',
              id: sentence.id,
              seq: this.#seq + 1,
              lang,
              text: sentence.texts[lang],
              isFinal: true,
            })
          }
        },
      })
    })

    return steps
  }

  #sessionEvent(): CaptionEvent {
    const { id, title, speaker, sourceLang, targetLangs } = this.#script
    return { type: 'session', sessionId: id, title, speaker, sourceLang, targetLangs }
  }

  /** 확정 이벤트 — 로그에 남기고 SSE id를 붙여 재연결 복구 대상으로 만든다 */
  #emitLogged(event: CaptionEvent): void {
    this.#seq += 1
    this.#log.push({ seq: this.#seq, event })
    if (this.#log.length > LOG_LIMIT) this.#log = this.#log.slice(-LOG_LIMIT)
    for (const client of this.#clients) this.#sendTo(client, event, this.#seq)
  }

  /** 휘발성 이벤트(부분 자막·하트비트) — 로그 없이 즉시 전달 */
  #broadcast(event: CaptionEvent): void {
    for (const client of this.#clients) this.#sendTo(client, event)
  }

  #sendTo(client: SseClient, event: CaptionEvent, id?: number): void {
    if (event.type === 'caption' && !client.langs.has(event.lang)) return
    writeSse(client.res, event, id)
  }
}
