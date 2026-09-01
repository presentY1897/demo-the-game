import type { CreateSessionRequest, SessionSummary } from '@thegame/realtime/http'
import { normalizeCode, randomCode } from './code'
import { keynote, type ScriptLang, type SessionScript } from './data/keynote'
import { SessionBroadcaster, type BroadcasterTiming } from './sse'

const ID_ATTEMPT_LIMIT = 50

export type CreateSessionResult =
  | { ok: true; id: string; summary: SessionSummary }
  | { ok: false; code: 'unsupported-language'; message: string }

export interface SessionManagerOptions {
  /** 테스트에서 재생을 빠르게 돌리기 위해 주입 */
  timing?: Partial<BroadcasterTiming>
  /** 새 세션의 자막 소스가 되는 스크립트 템플릿 */
  template?: SessionScript
  generateId?: () => string
}

function isScriptLang(template: SessionScript, lang: string): lang is ScriptLang {
  return lang === template.sourceLang || template.targetLangs.some((known) => known === lang)
}

/**
 * 세션 저장소 — 운영 콘솔(S13)이 만들고 제어하는 세션들을 들고 있다.
 * 상태(대기/재생/일시정지/종료)는 각 세션의 브로드캐스터가 소유한다.
 */
export class SessionManager {
  readonly #sessions = new Map<string, SessionBroadcaster>()
  readonly #timing: Partial<BroadcasterTiming>
  readonly #template: SessionScript
  readonly #generateId: () => string

  constructor(options: SessionManagerOptions = {}) {
    this.#timing = options.timing ?? {}
    this.#template = options.template ?? keynote
    this.#generateId = options.generateId ?? randomCode
  }

  /** 템플릿이 쓸 수 있는 언어 — 새 세션의 원문/제공 언어는 여기서만 고를 수 있다 */
  get templateLangs(): ScriptLang[] {
    return [this.#template.sourceLang, ...this.#template.targetLangs]
  }

  /**
   * 부팅 시 데모 세션 1건을 **대기 상태로** 등록한다.
   * 자동 재생은 하지 않는다(S13) — 로비 목록이 비지 않게 하기 위한 시드일 뿐이다.
   */
  seed(script: SessionScript = this.#template): SessionBroadcaster {
    const broadcaster = new SessionBroadcaster(script, this.#timing)
    this.#sessions.set(script.id, broadcaster)
    return broadcaster
  }

  get(id: string): SessionBroadcaster | undefined {
    return this.#sessions.get(id) ?? this.#sessions.get(normalizeCode(id))
  }

  list(): SessionSummary[] {
    return [...this.#sessions.values()].map((broadcaster) => {
      const { id, title, speaker, sourceLang, targetLangs } = broadcaster.script
      return {
        id,
        title,
        speaker,
        sourceLang,
        targetLangs: [...targetLangs],
        state: broadcaster.state,
        viewerCount: broadcaster.viewerCount,
      }
    })
  }

  /** `POST /api/sessions` — 템플릿 스크립트를 복제해 새 세션을 만든다 */
  create(request: CreateSessionRequest): CreateSessionResult {
    const supported = this.templateLangs
    if (!isScriptLang(this.#template, request.sourceLang)) {
      return {
        ok: false,
        code: 'unsupported-language',
        message: `sourceLang must be one of ${supported.join(', ')}`,
      }
    }
    const targetLangs: ScriptLang[] = []
    for (const lang of request.targetLangs) {
      if (!isScriptLang(this.#template, lang)) {
        return {
          ok: false,
          code: 'unsupported-language',
          message: `targetLangs must be a subset of ${supported.join(', ')}`,
        }
      }
      if (lang === request.sourceLang) {
        return {
          ok: false,
          code: 'unsupported-language',
          message: 'targetLangs must not contain sourceLang',
        }
      }
      if (!targetLangs.includes(lang)) targetLangs.push(lang)
    }

    const script: SessionScript = {
      id: this.#issueId(),
      title: request.title,
      speaker: request.speaker,
      sourceLang: request.sourceLang,
      targetLangs,
      // 자막 소스는 템플릿 복제 — 문장 객체는 공유하지 않고 얕게 복사한다
      sentences: this.#template.sentences.map((sentence) => ({
        id: sentence.id,
        texts: { ...sentence.texts },
      })),
    }

    const broadcaster = new SessionBroadcaster(script, this.#timing)
    this.#sessions.set(script.id, broadcaster)
    return {
      ok: true,
      id: script.id,
      summary: {
        id: script.id,
        title: script.title,
        speaker: script.speaker,
        sourceLang: script.sourceLang,
        targetLangs: [...script.targetLangs],
        state: broadcaster.state,
        viewerCount: broadcaster.viewerCount,
      },
    }
  }

  close(): void {
    for (const broadcaster of this.#sessions.values()) broadcaster.close()
    this.#sessions.clear()
  }

  /** 세션 id는 그대로 입장 코드로 쓰인다(S02) — 사람이 받아 적을 수 있는 6자리 */
  #issueId(): string {
    for (let attempt = 0; attempt < ID_ATTEMPT_LIMIT; attempt += 1) {
      const id = normalizeCode(this.#generateId())
      if (!this.#sessions.has(id)) return id
    }
    throw new Error(`session id generation failed after ${ID_ATTEMPT_LIMIT} attempts`)
  }
}
