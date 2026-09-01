import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import {
  adminSettingsRequestSchema,
  createSessionRequestSchema,
  rateRequestSchema,
} from '@thegame/realtime/http'
import type { WebSocketServer } from 'ws'
import { createConversationServer } from './conversation'
import { createCorsPolicy, type CorsPolicy } from './cors'
import { RoomRegistry, toAdminRoom, type RoomRegistryOptions } from './rooms'
import { SessionManager, type SessionManagerOptions } from './sessions'
import { SettingsStore } from './settings'
import type { BroadcasterTiming } from './sse'

const BODY_LIMIT_BYTES = 64 * 1024

export interface MockServerOptions {
  /** 방 TTL 테스트에서 시간을 밀기 위해 주입 */
  now?: () => number
  room?: Omit<RoomRegistryOptions, 'now'>
  session?: Omit<SessionManagerOptions, 'timing'>
  /** 재생 타이밍 — 테스트에서 짧게 줄인다 */
  timing?: Partial<BroadcasterTiming>
  botTypingDelayMs?: number
  botReplyDelayMs?: number
  /** 부팅 시 keynote 세션을 대기 상태로 시드할지 (기본 true) */
  seed?: boolean
  /**
   * CORS 허용 오리진 (쉼표 구분). 생략하면 `ALLOWED_ORIGINS` 환경변수를 읽고,
   * 그것도 없으면 `*` — 즉 **아무 설정 없는 로컬 실행은 예전 그대로다**.
   */
  allowedOrigins?: string
}

export interface MockServer {
  server: Server
  wss: WebSocketServer
  rooms: RoomRegistry
  sessions: SessionManager
  settings: SettingsStore
  cors: CorsPolicy
  close: () => Promise<void>
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function fail(res: ServerResponse, status: number, error: string, message: string): void {
  json(res, status, { error, message })
}

type BodyResult = { ok: true; value: unknown } | { ok: false; message: string }

async function readJsonBody(req: IncomingMessage): Promise<BodyResult> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > BODY_LIMIT_BYTES) return { ok: false, message: 'request body too large' }
    chunks.push(buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (raw === '') return { ok: true, value: {} }
  try {
    // 실시간 이벤트가 아니라 HTTP 요청 본문이다. 형태 검증은 라우팅에서 realtime의 zod가 한다.
    // eslint-disable-next-line @thegame/no-realtime-event-parse
    return { ok: true, value: JSON.parse(raw) }
  } catch {
    return { ok: false, message: 'request body is not valid JSON' }
  }
}

const SESSION_ACTION_PATH = /^\/api\/sessions\/([\w-]+)\/(stream|status|start|pause|resume|end|rate)$/
const ROOM_CODE_PATH = /^\/api\/rooms\/([\w-]+)$/

export function createMockServer(options: MockServerOptions = {}): MockServer {
  const rooms = new RoomRegistry({ ...options.room, ...(options.now ? { now: options.now } : {}) })
  const sessions = new SessionManager({ ...options.session, timing: options.timing ?? {} })
  const settings = new SettingsStore()
  const cors = createCorsPolicy(options.allowedOrigins ?? process.env['ALLOWED_ORIGINS'])
  const rejectedOrigins = new Set<string>()

  /** 무음 실패 금지 — 차단된 오리진은 오리진마다 한 번씩 경고로 남긴다 */
  function warnRejected(origin: string, what: string): void {
    if (rejectedOrigins.has(origin)) return
    rejectedOrigins.add(origin)
    console.warn(
      `[mock-server] CORS 차단: ${what} origin "${origin}" — ALLOWED_ORIGINS(${cors.patterns.join(', ')})에 없다`,
    )
  }

  if (options.seed !== false) sessions.seed()
  rooms.start()

  const server = createServer((req, res) => {
    handle(req, res).catch((cause: unknown) => {
      // 무음 실패 금지 — 로그를 남기고 클라이언트에도 분명한 에러로 돌려준다
      console.error('[mock-server] unhandled request error', cause)
      if (!res.headersSent) fail(res, 500, 'internal-error', 'unexpected server error')
      else res.end()
    })
  })

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const method = req.method ?? 'GET'

    const origin = req.headers.origin
    const allowOrigin = cors.allowOriginFor(origin)
    if (allowOrigin !== null) res.setHeader('Access-Control-Allow-Origin', allowOrigin)
    else if (origin !== undefined && origin !== '') warnRejected(origin, 'HTTP')
    // 오리진마다 응답이 달라지므로 캐시가 섞이지 않게 알린다
    if (!cors.allowAll) res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Last-Event-ID')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
    if (method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (url.pathname === '/health') {
      json(res, 200, { ok: true })
      return
    }

    // ── Symposia 세션 ──────────────────────────────────────────────────────

    if (url.pathname === '/api/sessions') {
      if (method === 'GET') {
        json(res, 200, sessions.list())
        return
      }
      if (method === 'POST') {
        const body = await readJsonBody(req)
        if (!body.ok) {
          fail(res, 400, 'invalid-json', body.message)
          return
        }
        const parsed = createSessionRequestSchema.safeParse(body.value)
        if (!parsed.success) {
          fail(res, 400, 'invalid-body', parsed.error.message)
          return
        }
        const created = sessions.create(parsed.data)
        if (!created.ok) {
          fail(res, 400, created.code, created.message)
          return
        }
        json(res, 201, created.summary)
        return
      }
      fail(res, 405, 'method-not-allowed', `${method} is not allowed on ${url.pathname}`)
      return
    }

    const sessionMatch = SESSION_ACTION_PATH.exec(url.pathname)
    if (sessionMatch) {
      const [, sessionId = '', action = ''] = sessionMatch
      const broadcaster = sessions.get(sessionId)
      if (!broadcaster) {
        fail(res, 404, 'not-found', `unknown session "${sessionId}"`)
        return
      }

      if (action === 'stream') {
        if (method !== 'GET') {
          fail(res, 405, 'method-not-allowed', `${method} is not allowed on ${url.pathname}`)
          return
        }
        // 재연결 복구: 네이티브 EventSource는 Last-Event-ID 헤더로, 수동 재연결
        // 클라이언트(@thegame/realtime)는 lastEventId 쿼리로 이어받는다
        const headerValue = req.headers['last-event-id']
        const rawLastEventId =
          url.searchParams.get('lastEventId') ??
          (Array.isArray(headerValue) ? headerValue[0] : headerValue)
        const lastEventId =
          rawLastEventId === undefined || rawLastEventId === null ? undefined : Number(rawLastEventId)
        broadcaster.handleStream(res, {
          lang: url.searchParams.get('lang') ?? undefined,
          lastEventId: lastEventId !== undefined && Number.isFinite(lastEventId) ? lastEventId : undefined,
        })
        return
      }

      if (action === 'status') {
        if (method !== 'GET') {
          fail(res, 405, 'method-not-allowed', `${method} is not allowed on ${url.pathname}`)
          return
        }
        json(res, 200, broadcaster.status)
        return
      }

      if (method !== 'POST') {
        fail(res, 405, 'method-not-allowed', `${method} is not allowed on ${url.pathname}`)
        return
      }

      if (action === 'rate') {
        const body = await readJsonBody(req)
        if (!body.ok) {
          fail(res, 400, 'invalid-json', body.message)
          return
        }
        const parsed = rateRequestSchema.safeParse(body.value)
        if (!parsed.success) {
          fail(res, 400, 'invalid-rate', parsed.error.message)
          return
        }
        const result = broadcaster.setRate(parsed.data.rate)
        if (!result.ok) {
          fail(res, result.code === 'invalid-rate' ? 400 : 409, result.code, result.message)
          return
        }
        json(res, 200, broadcaster.status)
        return
      }

      const result =
        action === 'start'
          ? broadcaster.start()
          : action === 'pause'
            ? broadcaster.pause()
            : action === 'resume'
              ? broadcaster.resume()
              : broadcaster.end()
      if (!result.ok) {
        fail(res, 409, result.code, result.message)
        return
      }
      json(res, 200, broadcaster.status)
      return
    }

    // ── CareTalk 방 ────────────────────────────────────────────────────────

    if (url.pathname === '/api/rooms') {
      if (method !== 'POST') {
        fail(res, 405, 'method-not-allowed', `${method} is not allowed on ${url.pathname}`)
        return
      }
      const room = rooms.create()
      json(res, 201, { roomId: room.id, inviteCode: room.inviteCode })
      return
    }

    const roomMatch = ROOM_CODE_PATH.exec(url.pathname)
    if (roomMatch) {
      if (method !== 'GET') {
        fail(res, 405, 'method-not-allowed', `${method} is not allowed on ${url.pathname}`)
        return
      }
      const room = rooms.byInviteCode(roomMatch[1] ?? '')
      if (!room) {
        fail(res, 404, 'not-found', 'no room for this invite code')
        return
      }
      rooms.touch(room)
      json(res, 200, { roomId: room.id, inviteCode: room.inviteCode })
      return
    }

    // ── CareTalk 관리자 ────────────────────────────────────────────────────

    if (url.pathname === '/api/admin/rooms') {
      if (method !== 'GET') {
        fail(res, 405, 'method-not-allowed', `${method} is not allowed on ${url.pathname}`)
        return
      }
      json(res, 200, rooms.list().map(toAdminRoom))
      return
    }

    if (url.pathname === '/api/admin/settings') {
      if (method === 'GET') {
        json(res, 200, settings.get())
        return
      }
      if (method === 'PUT') {
        const body = await readJsonBody(req)
        if (!body.ok) {
          fail(res, 400, 'invalid-json', body.message)
          return
        }
        const parsed = adminSettingsRequestSchema.safeParse(body.value)
        if (!parsed.success) {
          fail(res, 400, 'invalid-body', parsed.error.message)
          return
        }
        const result = settings.update(parsed.data.patientLangs)
        if (!result.ok) {
          fail(res, 400, result.code, result.message)
          return
        }
        json(res, 200, result.settings)
        return
      }
      fail(res, 405, 'method-not-allowed', `${method} is not allowed on ${url.pathname}`)
      return
    }

    fail(res, 404, 'not-found', `no route for ${method} ${url.pathname}`)
  }

  const wss = createConversationServer(rooms, {
    ...(options.botTypingDelayMs !== undefined ? { botTypingDelayMs: options.botTypingDelayMs } : {}),
    ...(options.botReplyDelayMs !== undefined ? { botReplyDelayMs: options.botReplyDelayMs } : {}),
  })

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    // WebSocket 핸드셰이크에는 CORS가 적용되지 않는다 — 브라우저가 막아주지 않으므로
    // 화이트리스트가 켜져 있으면 여기서 직접 거절한다. Origin 없는 요청(네이티브 앱·
    // 테스트 클라이언트)은 그대로 통과시킨다.
    const wsOrigin = req.headers.origin
    if (!cors.isAllowed(wsOrigin)) {
      warnRejected(wsOrigin ?? '', 'WebSocket')
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
      socket.destroy()
      return
    }
    if (url.pathname === '/ws/conversation') {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
    } else {
      socket.destroy()
    }
  })

  async function close(): Promise<void> {
    sessions.close()
    rooms.close()
    for (const client of wss.clients) client.terminate()
    await new Promise<void>((resolve) => wss.close(() => resolve()))
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }

  return { server, wss, rooms, sessions, settings, cors, close }
}
