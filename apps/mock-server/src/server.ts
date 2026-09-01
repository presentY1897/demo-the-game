import { createMockServer } from './app'

const PORT = Number(process.env['PORT'] ?? 4010)

const { server } = createMockServer()

server.listen(PORT, () => {
  console.log(`[mock-server] listening on http://localhost:${PORT}`)
  console.log(`[mock-server] 세션은 대기 상태로 시작한다 — 콘솔에서 시작시켜라:`)
  console.log(`[mock-server]   curl -X POST http://localhost:${PORT}/api/sessions/keynote-01/start`)
  console.log(`[mock-server] SSE    GET /api/sessions/keynote-01/stream?lang=en`)
  console.log(`[mock-server] WS     /ws/conversation`)
})
