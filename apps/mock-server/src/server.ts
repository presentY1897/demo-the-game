import { createServer, type ServerResponse } from 'node:http'
import { createConversationServer } from './conversation'
import { sessions } from './data/keynote'
import { SessionBroadcaster } from './sse'

const PORT = Number(process.env['PORT'] ?? 4010)

const broadcasters = new Map<string, SessionBroadcaster>(
  sessions.map((script) => [script.id, new SessionBroadcaster(script)]),
)
for (const broadcaster of broadcasters.values()) broadcaster.start()

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const STREAM_PATH = /^\/api\/sessions\/([\w-]+)\/stream$/

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Last-Event-ID')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (url.pathname === '/health') {
    json(res, 200, { ok: true })
    return
  }

  if (url.pathname === '/api/sessions') {
    json(
      res,
      200,
      sessions.map(({ id, title, speaker, sourceLang, targetLangs }) => ({
        id,
        title,
        speaker,
        sourceLang,
        targetLangs,
      })),
    )
    return
  }

  const streamMatch = STREAM_PATH.exec(url.pathname)
  if (streamMatch) {
    const broadcaster = broadcasters.get(streamMatch[1] ?? '')
    if (!broadcaster) {
      json(res, 404, { error: 'unknown session' })
      return
    }
    // 재연결 복구: 네이티브 EventSource는 Last-Event-ID 헤더로, 수동 재연결
    // 클라이언트(@thegame/realtime)는 lastEventId 쿼리로 이어받는다
    const headerValue = req.headers['last-event-id']
    const rawLastEventId =
      url.searchParams.get('lastEventId') ?? (Array.isArray(headerValue) ? headerValue[0] : headerValue)
    const lastEventId = rawLastEventId === undefined || rawLastEventId === null ? undefined : Number(rawLastEventId)
    broadcaster.handleStream(res, {
      lang: url.searchParams.get('lang') ?? undefined,
      lastEventId: lastEventId !== undefined && Number.isFinite(lastEventId) ? lastEventId : undefined,
    })
    return
  }

  json(res, 404, { error: 'not found' })
})

const wss = createConversationServer()

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  if (url.pathname === '/ws/conversation') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
  } else {
    socket.destroy()
  }
})

server.listen(PORT, () => {
  console.log(`[mock-server] listening on http://localhost:${PORT}`)
  console.log(`[mock-server] SSE    GET /api/sessions/keynote-01/stream?lang=en`)
  console.log(`[mock-server] WS     /ws/conversation`)
})
