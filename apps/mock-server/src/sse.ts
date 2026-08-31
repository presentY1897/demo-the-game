import type { ServerResponse } from 'node:http'
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

const PARTIAL_INTERVAL_MS = 320
const PARTIAL_WORDS_PER_TICK = 2
const TRANSLATION_DELAY_MS = 400
const SENTENCE_GAP_MS = 1400
const RESTART_DELAY_MS = 3000
const HEARTBEAT_INTERVAL_MS = 15_000
const LOG_LIMIT = 500
const CATCH_UP_COUNT = 8

function writeSse(res: ServerResponse, event: CaptionEvent, id?: number): void {
  if (id !== undefined) res.write(`id: ${id}\n`)
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

/**
 * 강연 스크립트를 실시간처럼 재생하는 공유 브로드캐스터.
 * 모든 시청자는 같은 시점을 본다 — 부분 자막(STT 진행) → 원문 확정 →
 * 번역 지연 후 언어별 확정 순서로 흘러간다.
 *
 * SSE `id:`는 확정 이벤트에만 붙인다. 재연결 시 lastEventId 이후의
 * 확정 자막만 복구되고, 휘발성인 부분 자막은 다시 보내지 않는다.
 */
export class SessionBroadcaster {
  readonly #script: SessionScript
  readonly #clients = new Set<SseClient>()
  #log: LoggedEvent[] = []
  #seq = 0

  constructor(script: SessionScript) {
    this.#script = script
  }

  get script(): SessionScript {
    return this.#script
  }

  start(): void {
    this.#playSentence(0)
    setInterval(() => {
      this.#broadcast({ type: 'heartbeat', ts: Date.now() })
    }, HEARTBEAT_INTERVAL_MS).unref()
  }

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

  #sessionEvent(): CaptionEvent {
    const { id, title, speaker, sourceLang, targetLangs } = this.#script
    return { type: 'session', sessionId: id, title, speaker, sourceLang, targetLangs }
  }

  #playSentence(index: number): void {
    if (index >= this.#script.sentences.length) {
      this.#emitLogged({ type: 'session-ended', sessionId: this.#script.id })
      setTimeout(() => this.#playSentence(0), RESTART_DELAY_MS)
      return
    }
    if (index === 0) this.#emitLogged(this.#sessionEvent())

    const sentence = this.#script.sentences[index]
    if (!sentence) return
    const sourceText = sentence.texts[this.#script.sourceLang]
    const words = sourceText.split(' ')

    this.#emitPartials(sentence.id, words, PARTIAL_WORDS_PER_TICK, () => {
      this.#emitLogged({
        type: 'caption',
        id: sentence.id,
        seq: this.#seq + 1,
        lang: this.#script.sourceLang,
        text: sourceText,
        isFinal: true,
      })
      setTimeout(() => {
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
        setTimeout(() => this.#playSentence(index + 1), SENTENCE_GAP_MS)
      }, TRANSLATION_DELAY_MS)
    })
  }

  #emitPartials(sentenceId: string, words: string[], count: number, done: () => void): void {
    this.#broadcast({
      type: 'caption',
      id: sentenceId,
      seq: this.#seq + 1,
      lang: this.#script.sourceLang,
      text: words.slice(0, count).join(' '),
      isFinal: false,
    })
    if (count >= words.length) {
      setTimeout(done, PARTIAL_INTERVAL_MS)
      return
    }
    setTimeout(
      () => this.#emitPartials(sentenceId, words, count + PARTIAL_WORDS_PER_TICK, done),
      PARTIAL_INTERVAL_MS,
    )
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
