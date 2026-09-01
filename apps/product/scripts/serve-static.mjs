/**
 * `output: 'export'` 산출물(out/)을 프로덕션과 비슷한 조건으로 서빙하는 최소 정적 서버.
 * `next start`는 export 모드에서 동작하지 않으므로, Lighthouse 측정용 서버로 이걸 쓴다.
 * - 확장자 없는 경로 → `<path>.html` 매핑 (Next export 산출물 구조)
 * - 텍스트 자산 gzip 압축 (실제 배포 환경과 맞추기 위함)
 * - 정적 자산 `/_next/static/**`는 immutable 캐시 헤더
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createGzip } from 'node:zlib'
import { extname, join, normalize, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? 'out')
const port = Number(process.argv[3] ?? 3011)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.txt', '.xml', '.svg'])

function resolveFile(pathname) {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
  const base = join(root, rel)
  const candidates = [base, `${base}.html`, join(base, 'index.html')]
  return candidates.find((file) => file.startsWith(root) && existsSync(file) && statSync(file).isFile())
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  const match = resolveFile(pathname)
  const file = match ?? join(root, '404.html')
  const found = match !== undefined
  const ext = extname(file)

  const headers = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Cache-Control': pathname.startsWith('/_next/static/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
  }

  const acceptsGzip = (req.headers['accept-encoding'] ?? '').includes('gzip')
  if (acceptsGzip && COMPRESSIBLE.has(ext)) {
    res.writeHead(found ? 200 : 404, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' })
    createReadStream(file).pipe(createGzip()).pipe(res)
    return
  }

  res.writeHead(found ? 200 : 404, { ...headers, 'Content-Length': statSync(file).size })
  createReadStream(file).pipe(res)
}).listen(port, () => {
  console.log(`serving ${root} on http://localhost:${port}`)
})
