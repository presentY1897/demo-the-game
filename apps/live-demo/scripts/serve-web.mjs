/**
 * `expo export --platform web` 산출물(dist/)을 **배포 호스트와 같은 규칙으로** 서빙한다.
 *
 * 산출물은 `index.html` 하나뿐인 SPA라, `/room/:code`·`/console` 같은 주소로 직접
 * 들어오면 정적 호스트는 404를 낸다. 배포(Vercel)에서는 `vercel.json`의 rewrite가
 * 이걸 막는데, 그 규칙이 맞는지 로컬에서 확인할 수단이 필요하다(S07/S03).
 *
 * 여기서 재현하는 순서는 Vercel과 같다: **파일이 있으면 파일, 없으면 index.html**.
 *
 *   pnpm --filter @thegame/live-demo build
 *   node apps/live-demo/scripts/serve-web.mjs apps/live-demo/dist 8081
 *   curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8081/room/ABC123
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? 'dist')
const port = Number(process.argv[3] ?? 8081)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
}

function resolveFile(pathname) {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
  const base = join(root, rel)
  const candidates = [base, join(base, 'index.html')]
  return candidates.find((file) => file.startsWith(root) && existsSync(file) && statSync(file).isFile())
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  // 1) 파일시스템 우선 — 해시 붙은 번들·favicon은 그대로 나간다
  // 2) 없으면 SPA 폴백 — 앱이 주소를 읽어 라우팅한다
  const file = resolveFile(pathname) ?? join(root, 'index.html')
  const ext = extname(file)
  res.writeHead(200, {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Cache-Control': pathname.startsWith('/_expo/static/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
    'Content-Length': statSync(file).size,
  })
  createReadStream(file).pipe(res)
}).listen(port, () => {
  console.log(`serving ${root} (SPA fallback) on http://localhost:${port}`)
})
