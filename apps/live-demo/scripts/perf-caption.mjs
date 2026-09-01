/**
 * 자막 스트림 리렌더 측정 하네스 (S08 / docs/perf/001-자막-리렌더.md).
 *
 * 한 번 실행하면 다음을 자동으로 한다.
 *   1. 목 서버를 이 프로세스 안에 띄운다 (`createMockServer` 그대로 — 소스 수정 없음).
 *      `--sentences`로 강연 스크립트 길이를 늘려 "자막 N건" 조건을 만든다.
 *   2. `expo export` 산출물을 배포와 같은 규칙으로 서빙한다 (`serve-web.mjs`).
 *   3. 헤드리스 크로미움을 띄우고 CDP로 **CPU 4× 스로틀 + 모바일 뷰포트**를 건다.
 *   4. 페이지의 모든 스크립트보다 먼저 계측기(`perf-caption-probe.js`)를 주입한다.
 *   5. 세션을 시작시키고 종료 이벤트까지 기다린 뒤, 커밋 기록을 받아 요약한다.
 *
 * 실행 (저장소 루트에서):
 *
 *   PROFILE_REACT=1 EXPO_PUBLIC_API_URL=http://localhost:4021 \
 *     pnpm --filter @thegame/live-demo exec expo export --platform web \
 *     --output-dir dist-profile --no-minify
 *
 *   pnpm --filter @thegame/mock-server exec tsx \
 *     ../live-demo/scripts/perf-caption.mjs --label before --sentences 40
 *
 * tsx로 도는 이유는 목 서버(TS)를 그대로 import하기 위해서다.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockServer } from '../../mock-server/src/app.ts'
import { keynote } from '../../mock-server/src/data/keynote.ts'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const repoRoot = resolve(appRoot, '../..')

const DEFAULT_CHROME = '/home/hyun/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'

function parseArgs(argv) {
  const args = {
    label: 'run',
    sentences: 40,
    rate: 2,
    cpu: 4,
    apiPort: 4021,
    webPort: 8121,
    cdpPort: 9333,
    dist: 'dist-profile',
    out: '',
    from: '',
    timeoutMs: 300_000,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const name = key.slice(2)
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) continue
    i += 1
    if (name in args) args[name] = typeof args[name] === 'number' ? Number(value) : value
    else throw new Error(`알 수 없는 옵션: ${key}`)
  }
  return args
}

/**
 * 강연 스크립트를 원하는 문장 수로 만든다.
 * 10문장 이하면 keynote 원본을 그대로 자르고(= 배포된 목 서버와 동일),
 * 그 이상은 문장을 순환 복제하며 id만 사이클 번호로 구분한다.
 */
function buildScript(sentences) {
  const source = keynote.sentences
  const out = []
  for (let i = 0; i < sentences; i += 1) {
    const base = source[i % source.length]
    const cycle = Math.floor(i / source.length)
    out.push({
      id: cycle === 0 ? base.id : `${base.id}c${cycle}`,
      texts: { ...base.texts },
    })
  }
  return { ...keynote, sentences: out }
}

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms))
}

// ── CDP 최소 클라이언트 (Node 24의 전역 WebSocket 사용) ─────────────────────

class Cdp {
  #ws
  #next = 1
  #pending = new Map()

  static async connect(url) {
    const ws = new WebSocket(url)
    await new Promise((done, fail) => {
      ws.addEventListener('open', done, { once: true })
      ws.addEventListener('error', () => fail(new Error(`CDP 연결 실패: ${url}`)), { once: true })
    })
    return new Cdp(ws)
  }

  #handlers = new Map()

  constructor(ws) {
    this.#ws = ws
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      if (message.id === undefined) {
        this.#handlers.get(message.method)?.(message.params)
        return
      }
      const pending = this.#pending.get(message.id)
      if (pending === undefined) return
      this.#pending.delete(message.id)
      if (message.error) pending.fail(new Error(`${message.error.message} (${pending.method})`))
      else pending.done(message.result)
    })
  }

  /** 페이지 콘솔·예외를 놓치지 않게 이벤트도 받는다 (무음 실패 금지) */
  on(method, handler) {
    this.#handlers.set(method, handler)
  }

  send(method, params = {}, sessionId) {
    const id = this.#next
    this.#next += 1
    const payload = { id, method, params }
    if (sessionId !== undefined) payload.sessionId = sessionId
    this.#ws.send(JSON.stringify(payload))
    return new Promise((done, fail) => this.#pending.set(id, { done, fail, method }))
  }

  close() {
    this.#ws.close()
  }
}

async function waitForHttp(url, timeoutMs, asJson = false) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      const res = await fetch(url)
      if (res.ok) return asJson ? await res.json() : null
    } catch {
      // 아직 안 떴다 — 재시도
    }
    if (Date.now() > deadline) throw new Error(`응답 없음: ${url}`)
    await sleep(150)
  }
}

// ── 통계 ────────────────────────────────────────────────────────────────────

const quantile = (sorted, q) =>
  sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]

function stats(values) {
  if (values.length === 0) return { n: 0, mean: 0, p50: 0, p95: 0, max: 0, sum: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const sum = values.reduce((a, b) => a + b, 0)
  return {
    n: values.length,
    mean: sum / values.length,
    p50: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    max: sorted[sorted.length - 1],
    sum,
  }
}

/** rendered = a + b·rows 최소제곱 기울기 — "커밋 규모가 자막 개수에 비례하는가" */
function slope(points) {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: 0 }
  const mx = points.reduce((a, p) => a + p.x, 0) / n
  const my = points.reduce((a, p) => a + p.y, 0) / n
  let num = 0
  let den = 0
  for (const p of points) {
    num += (p.x - mx) * (p.y - my)
    den += (p.x - mx) ** 2
  }
  return { slope: den === 0 ? 0 : num / den, intercept: my - (den === 0 ? 0 : num / den) * mx }
}

function summarize(perf, args) {
  const kindOf = (index) => (index < 0 ? 'startup' : (perf.events[index]?.kind ?? 'startup'))
  const byKind = new Map()
  for (const commit of perf.commits) {
    const kind = kindOf(commit.eventIndex)
    if (!byKind.has(kind)) byKind.set(kind, [])
    byKind.get(kind).push(commit)
  }

  const eventCounts = {}
  for (const event of perf.events) eventCounts[event.kind] = (eventCounts[event.kind] ?? 0) + 1

  // 이벤트 1건이 낳은 커밋들을 합친다 — 명세가 요구하는 단위는 "부분 자막 이벤트 1회당"이다
  const perEvent = new Map()
  for (const commit of perf.commits) {
    if (commit.eventIndex < 0) continue
    const bucket = perEvent.get(commit.eventIndex) ?? { components: 0, ms: 0, commits: 0 }
    bucket.components += commit.rendered
    bucket.ms += commit.dur
    bucket.commits += 1
    perEvent.set(commit.eventIndex, bucket)
  }
  const eventTotals = new Map()
  perf.events.forEach((event, index) => {
    const list = eventTotals.get(event.kind) ?? []
    list.push(perEvent.get(index) ?? { components: 0, ms: 0, commits: 0 })
    eventTotals.set(event.kind, list)
  })

  const groups = {}
  for (const [kind, commits] of byKind) {
    const totals = eventTotals.get(kind) ?? []
    const components = {}
    for (const commit of commits) {
      for (const [name, count] of Object.entries(commit.counts)) {
        components[name] = (components[name] ?? 0) + count
      }
    }
    groups[kind] = {
      events: eventCounts[kind] ?? 0,
      commits: commits.length,
      commitsPerEvent: (eventCounts[kind] ?? 0) === 0 ? null : commits.length / eventCounts[kind],
      perEventComponents: stats(totals.map((t) => t.components)),
      perEventRenderMs: stats(totals.map((t) => t.ms)),
      rendered: stats(commits.map((c) => c.rendered)),
      renderMs: stats(commits.map((c) => c.dur)),
      renderedRows: stats(commits.map((c) => c.renderedRows)),
      mountedRows: stats(commits.map((c) => c.rows)),
      topComponents: Object.entries(components)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12),
    }
  }

  const partials = byKind.get('partial') ?? []
  const scaling = slope(partials.map((c) => ({ x: c.rows, y: c.rendered })))
  const buckets = new Map()
  for (const commit of partials) {
    const bucket = Math.floor(commit.rows / 5) * 5
    if (!buckets.has(bucket)) buckets.set(bucket, [])
    buckets.get(bucket).push(commit)
  }

  return {
    label: args.label,
    config: {
      sentences: args.sentences,
      rate: args.rate,
      cpuThrottle: args.cpu,
      viewport: '412x823 @1.75 (mobile)',
    },
    events: eventCounts,
    commitsTotal: perf.commits.length,
    renderMsTotal: perf.commits.reduce((a, c) => a + c.dur, 0),
    groups,
    partialScaling: {
      slopeRenderedPerRow: scaling.slope,
      intercept: scaling.intercept,
      buckets: [...buckets.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([rows, commits]) => ({
          mountedRows: `${rows}-${rows + 4}`,
          commits: commits.length,
          rendered: stats(commits.map((c) => c.rendered)),
          renderMs: stats(commits.map((c) => c.dur)),
        })),
    },
    errors: perf.errors,
  }
}

function printSummary(summary) {
  const f = (value) => (typeof value === 'number' ? value.toFixed(2) : String(value))
  console.log(`\n══ ${summary.label} ══`)
  console.log(`설정: ${JSON.stringify(summary.config)}`)
  console.log(`이벤트: ${JSON.stringify(summary.events)}`)
  console.log(`커밋 총 ${summary.commitsTotal}건, 렌더 시간 합계 ${f(summary.renderMsTotal)}ms`)
  for (const [kind, group] of Object.entries(summary.groups)) {
    console.log(
      `\n[${kind}] 커밋 ${group.commits}건` +
        (group.commitsPerEvent === null ? '' : ` (이벤트당 ${f(group.commitsPerEvent)})`),
    )
    console.log(
      `  이벤트 1회당 렌더된 컴포넌트: 평균 ${f(group.perEventComponents.mean)}` +
        `  p50 ${group.perEventComponents.p50}  p95 ${group.perEventComponents.p95}` +
        `  max ${group.perEventComponents.max}`,
    )
    console.log(
      `  이벤트 1회당 렌더 시간(ms): 평균 ${f(group.perEventRenderMs.mean)}` +
        `  p50 ${f(group.perEventRenderMs.p50)}  p95 ${f(group.perEventRenderMs.p95)}` +
        `  max ${f(group.perEventRenderMs.max)}`,
    )
    console.log(
      `  렌더된 컴포넌트/커밋: 평균 ${f(group.rendered.mean)}  p50 ${group.rendered.p50}` +
        `  p95 ${group.rendered.p95}  max ${group.rendered.max}`,
    )
    console.log(
      `  커밋 시간(ms): 평균 ${f(group.renderMs.mean)}  p50 ${f(group.renderMs.p50)}` +
        `  p95 ${f(group.renderMs.p95)}  max ${f(group.renderMs.max)}  합계 ${f(group.renderMs.sum)}`,
    )
    console.log(
      `  CaptionRow: 렌더 평균 ${f(group.renderedRows.mean)} / 마운트 평균 ${f(group.mountedRows.mean)}`,
    )
    console.log(`  상위 컴포넌트: ${group.topComponents.map(([n, c]) => `${n}×${c}`).join(', ')}`)
  }
  console.log(
    `\n부분 자막 커밋의 규모 ~ 자막 개수 기울기: ${f(summary.partialScaling.slopeRenderedPerRow)}` +
      ` (절편 ${f(summary.partialScaling.intercept)})`,
  )
  for (const bucket of summary.partialScaling.buckets) {
    console.log(
      `  마운트 행 ${bucket.mountedRows}: 커밋 ${bucket.commits}건, 렌더 컴포넌트 평균 ` +
        `${f(bucket.rendered.mean)}, 커밋 시간 평균 ${f(bucket.renderMs.mean)}ms ` +
        `(p95 ${f(bucket.renderMs.p95)}ms)`,
    )
  }
  if (summary.errors.length > 0) console.log(`\n계측 오류: ${summary.errors.join(' / ')}`)
}

// ── 실행 ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2))

  // 원자료에서 요약만 다시 계산한다 — 측정을 다시 돌리지 않고도 같은 수치가 나온다
  if (args.from !== '') {
    const saved = JSON.parse(readFileSync(resolve(repoRoot, args.from), 'utf8'))
    printSummary(summarize(saved.raw, { ...args, ...saved.summary.config, label: args.label }))
    return
  }

  const script = buildScript(args.sentences)
  const distDir = resolve(appRoot, args.dist)
  const chromePath = process.env.CHROME_PATH ?? DEFAULT_CHROME
  const userDataDir = mkdtempSync(join(tmpdir(), 'perf-caption-'))
  const cleanups = []

  try {
    // 1. 목 서버
    const mock = createMockServer({ session: { template: script }, allowedOrigins: '*' })
    await new Promise((done) => mock.server.listen(args.apiPort, done))
    cleanups.push(() => mock.close())
    console.log(`[perf] 목 서버 :${args.apiPort} — ${script.sentences.length}문장`)

    // 2. 정적 서버 (배포와 같은 규칙)
    const web = spawn(process.execPath, [
      resolve(appRoot, 'scripts/serve-web.mjs'),
      distDir,
      String(args.webPort),
    ])
    web.stderr.on('data', (chunk) => process.stderr.write(`[serve-web] ${chunk}`))
    cleanups.push(() => web.kill())
    await waitForHttp(`http://127.0.0.1:${args.webPort}/index.html`, 15_000)

    // 3. 크로미움 + CDP
    const chrome = spawn(chromePath, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${args.cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ])
    chrome.on('error', (error) => console.error('[chrome]', error))
    cleanups.push(() => chrome.kill())

    const version = await waitForHttp(`http://127.0.0.1:${args.cdpPort}/json/version`, 20_000, true)
    const cdp = await Cdp.connect(version.webSocketDebuggerUrl)
    cleanups.push(() => cdp.close())

    const { targetInfos } = await cdp.send('Target.getTargets')
    const page = targetInfos.find((target) => target.type === 'page')
    const { sessionId } = await cdp.send('Target.attachToTarget', {
      targetId: page.targetId,
      flatten: true,
    })

    cdp.on('Runtime.consoleAPICalled', ({ type, args }) => {
      const text = (args ?? []).map((arg) => arg.value ?? arg.description ?? arg.type).join(' ')
      if (type === 'error' || type === 'warning') console.log(`[page:${type}] ${text}`)
    })
    cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
      console.log(`[page:exception] ${exceptionDetails.exception?.description ?? exceptionDetails.text}`)
    })

    await cdp.send('Page.enable', {}, sessionId)
    await cdp.send('Runtime.enable', {}, sessionId)
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      { width: 412, height: 823, deviceScaleFactor: 1.75, mobile: true },
      sessionId,
    )
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: args.cpu }, sessionId)
    await cdp.send(
      'Page.addScriptToEvaluateOnNewDocument',
      { source: readFileSync(resolve(here, 'perf-caption-probe.js'), 'utf8') },
      sessionId,
    )

    const evaluate = async (expression) => {
      const { result, exceptionDetails } = await cdp.send(
        'Runtime.evaluate',
        { expression, returnByValue: true, awaitPromise: true },
        sessionId,
      )
      if (exceptionDetails) throw new Error(`페이지 평가 실패: ${exceptionDetails.text}`)
      return result.value
    }

    // 4. 자막 화면 진입 — 스트림이 열려 session 이벤트를 받을 때까지 기다린다
    const url = `http://localhost:${args.webPort}/session/${script.id}`
    console.log(`[perf] ${url} 로 이동 (CPU ${args.cpu}× 스로틀)`)
    await cdp.send('Page.navigate', { url }, sessionId)

    const readyDeadline = Date.now() + 60_000
    for (;;) {
      const ready = await evaluate(
        `Boolean(window.__captionPerf && window.__captionPerf.events.some((e) => e.kind === 'session'))`,
      )
      if (ready) break
      if (Date.now() > readyDeadline) {
        const dump = await evaluate(
          `JSON.stringify({ perf: window.__captionPerf ?? null, url: location.href, text: (document.body && document.body.innerText || '').slice(0, 400) })`,
        )
        throw new Error(`SSE 스트림이 열리지 않았다 — ${dump}`)
      }
      await sleep(250)
    }

    // 5. 재생
    const api = `http://127.0.0.1:${args.apiPort}/api/sessions/${script.id}`
    if (args.rate !== 1) {
      await fetch(`${api}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: args.rate }),
      })
    }
    await fetch(`${api}/start`, { method: 'POST' })
    console.log(`[perf] 재생 시작 (rate ${args.rate})`)

    const deadline = Date.now() + args.timeoutMs
    for (;;) {
      const done = await evaluate('Boolean(window.__captionPerf && window.__captionPerf.ended)')
      if (done) break
      if (Date.now() > deadline) throw new Error('세션이 시간 안에 끝나지 않았다')
      await sleep(1000)
    }
    await sleep(1000)

    const perf = await evaluate('JSON.stringify(window.__captionPerf)').then((raw) =>
      JSON.parse(raw),
    )
    if (!perf.injected) throw new Error('React DevTools 훅이 주입되지 않았다')

    const summary = summarize(perf, args)
    printSummary(summary)

    const out = args.out === '' ? resolve(repoRoot, `perf-caption-${args.label}.json`) : args.out
    writeFileSync(out, JSON.stringify({ summary, raw: perf }, null, 2))
    console.log(`\n[perf] 원자료: ${out}`)
  } finally {
    for (const cleanup of cleanups.reverse()) {
      try {
        await cleanup()
      } catch (error) {
        console.error('[perf] 정리 실패', error)
      }
    }
    await sleep(500)
    try {
      rmSync(userDataDir, { recursive: true, force: true })
    } catch (error) {
      console.error('[perf] 임시 프로필 삭제 실패 (측정에는 영향 없음)', error)
    }
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
