/**
 * live-demo 접근성 감사 하네스 (S06 기준 2·3·4).
 *
 * react-native-web은 RN의 접근성 속성을 DOM(`role`/`aria-*`)으로 옮긴다. 그래서 웹
 * 빌드를 헤드리스 크로미움에 띄우면 **RN 화면 그대로**를 axe-core로 검사하고, 터치
 * 타깃을 `getBoundingClientRect()`로 실측하고, 글자 확대를 흉내 낼 수 있다.
 *
 * 한 번 실행하면 다음을 자동으로 한다.
 *   1. 목 서버를 띄운다 (`tsx apps/mock-server/src/server.ts`, 소스는 건드리지 않는다).
 *   2. `expo export` 산출물을 배포와 같은 규칙으로 서빙한다 (`serve-web.mjs`).
 *   3. 헤드리스 크로미움을 띄우고 CDP로 붙는다.
 *   4. 시나리오(화면 상태)마다 실제 마우스 이벤트로 화면을 만든 뒤
 *      axe-core → 터치 타깃 → 글자 확대(1.0/1.5/2.0) 순으로 잰다.
 *   5. 결과를 JSON으로 남기고 요약을 출력한다.
 *
 * 실행 (저장소 루트에서):
 *
 *   EXPO_PUBLIC_API_URL=http://localhost:4010 pnpm --filter @thegame/live-demo exec \
 *     expo export --platform web --clear
 *   node apps/live-demo/scripts/a11y-audit.mjs --label before --out /tmp/a11y-before.json
 *
 * 빌드에 목 서버 주소가 박히므로(`EXPO_PUBLIC_*`는 번들 시점에 치환된다) 하네스가
 * 산출물을 먼저 검사해 포트가 어긋나면 멈춘다 — 스트림이 조용히 안 열리는 걸 막는다.
 *
 * 글자 확대 흉내에 관하여: RNW는 OS 글자 크기를 웹에 반영하지 않는다
 * (`Dimensions.window.fontScale`이 언제나 1). 그래서 여기서는 RN 네이티브가 하는 것과
 * 같은 방식으로 흉내 낸다 — **font-size만 k배 하고 line-height(px)는 그대로 둔다.**
 * RN에서 `allowFontScaling`은 fontSize만 키우고 숫자로 준 `lineHeight`는 키우지 않기
 * 때문이다. 즉 여기서 잘리면 실기기에서도 잘린다.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const repoRoot = resolve(appRoot, '../..')

const DEFAULT_CHROME = '/home/hyun/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'
const AXE_PATH = resolve(repoRoot, 'node_modules/.pnpm/axe-core@4.13.0/node_modules/axe-core/axe.min.js')

/** S06 기준 3 */
const MIN_TOUCH = 44
/** 흉내 낼 OS 글자 배율 */
const FONT_SCALES = [1, 1.5, 2]

function parseArgs(argv) {
  const args = {
    label: 'run',
    apiPort: 4010,
    webPort: 8531,
    cdpPort: 9531,
    dist: 'dist',
    out: '',
    width: 412,
    height: 823,
    only: '',
    /** 'light' | 'dark' — prefers-color-scheme 에뮬레이션 (다크 팔레트 대비 확인용) */
    scheme: 'light',
  }
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const name = key.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) continue
    i += 1
    if (name in args) args[name] = typeof args[name] === 'number' ? Number(value) : value
    else throw new Error(`알 수 없는 옵션: ${key}`)
  }
  return args
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

/**
 * `EXPO_PUBLIC_API_URL`은 번들 시점에 문자열로 치환된다. 산출물이 다른 포트를 보고
 * 있으면 자막 스트림이 열리지 않고 화면은 "연결 중…"에서 멈춘다 — 조용히 넘어가면
 * "위반 0건"이 빈 화면 때문이라는 걸 못 알아챈다. 그래서 먼저 확인하고 멈춘다.
 */
function assertBundleTargets(distDir, apiPort) {
  const jsDir = resolve(distDir, '_expo/static/js/web')
  const bundles = readdirSync(jsDir).filter((file) => file.endsWith('.js'))
  const wanted = `localhost:${apiPort}`
  for (const bundle of bundles) {
    const source = readFileSync(join(jsDir, bundle), 'utf8')
    if (source.includes(wanted)) return
    const found = [...source.matchAll(/localhost:(\d{4,5})/g)].map((m) => m[1])
    throw new Error(
      `번들이 목 서버 ${wanted}을(를) 가리키지 않는다 (찾은 포트: ${[...new Set(found)].join(', ') || '없음'}). ` +
        `EXPO_PUBLIC_API_URL=http://localhost:${apiPort} 로 --clear 빌드를 다시 해라.`,
    )
  }
  throw new Error(`번들을 찾지 못했다: ${jsDir}`)
}

// ── CDP 최소 클라이언트 (perf-caption.mjs와 같은 형태) ──────────────────────

class Cdp {
  #ws
  #next = 1
  #pending = new Map()
  #handlers = new Map()

  static async connect(url) {
    const ws = new WebSocket(url)
    await new Promise((done, fail) => {
      ws.addEventListener('open', done, { once: true })
      ws.addEventListener('error', () => fail(new Error(`CDP 연결 실패: ${url}`)), { once: true })
    })
    return new Cdp(ws)
  }

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

// ── 페이지에 주입하는 계측기 ────────────────────────────────────────────────

/**
 * 이 문자열은 페이지 안에서 평가된다. 밖의 스코프를 참조하지 않는다.
 */
const PROBE = String.raw`
window.__a11y = (function () {
  var MIN_TOUCH = ${MIN_TOUCH}

  var INTERACTIVE = [
    '[role=button]', '[role=switch]', '[role=radio]', '[role=checkbox]',
    '[role=link]', '[role=tab]', '[role=menuitem]', '[role=combobox]',
    'button', 'a[href]', 'input', 'textarea', 'select', '[tabindex]:not([tabindex="-1"])',
  ].join(',')

  function visible(el) {
    var rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    var cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return false
    return true
  }

  function name(el) {
    var aria = el.getAttribute('aria-label')
    if (aria) return aria.trim()
    var text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
    if (text) return text.slice(0, 60)
    var ph = el.getAttribute('placeholder')
    if (ph) return '[placeholder] ' + ph
    return ''
  }

  function selector(el) {
    var parts = []
    var node = el
    for (var i = 0; node && i < 4; i += 1) {
      var part = node.tagName.toLowerCase()
      var role = node.getAttribute && node.getAttribute('role')
      if (role) part += '[role=' + role + ']'
      parts.unshift(part)
      node = node.parentElement
    }
    return parts.join('>')
  }

  return {
    /** 인터랙티브 요소의 실측 크기 + 접근 가능한 이름 유무 */
    targets: function () {
      var out = []
      var nodes = document.querySelectorAll(INTERACTIVE)
      for (var i = 0; i < nodes.length; i += 1) {
        var el = nodes[i]
        if (!visible(el)) continue
        var rect = el.getBoundingClientRect()
        out.push({
          role: el.getAttribute('role') || el.tagName.toLowerCase(),
          name: name(el),
          selector: selector(el),
          w: Math.round(rect.width * 10) / 10,
          h: Math.round(rect.height * 10) / 10,
          small: Math.min(rect.width, rect.height) < MIN_TOUCH - 0.5,
          hasName: name(el).length > 0,
        })
      }
      return out
    },

    /** font-size만 k배 한다 (RN의 allowFontScaling과 같은 규칙 — lineHeight는 안 건드린다) */
    setFontScale: function (k) {
      if (!window.__a11yFonts) {
        window.__a11yFonts = new WeakMap()
      }
      var nodes = document.querySelectorAll('*')
      for (var i = 0; i < nodes.length; i += 1) {
        var el = nodes[i]
        var base = window.__a11yFonts.get(el)
        if (base === undefined) {
          base = parseFloat(getComputedStyle(el).fontSize) || 16
          window.__a11yFonts.set(el, base)
        }
        el.style.fontSize = base * k + 'px'
      }
      return nodes.length
    },

    /** 내용이 상자보다 커서 잘리는 곳 */
    clipped: function () {
      var out = []
      var nodes = document.querySelectorAll('*')
      for (var i = 0; i < nodes.length; i += 1) {
        var el = nodes[i]
        if (!visible(el)) continue
        var cs = getComputedStyle(el)
        var overY = cs.overflowY
        var overX = cs.overflowX
        var dy = el.scrollHeight - el.clientHeight
        var dx = el.scrollWidth - el.clientWidth
        // 스크롤이 목적인 컨테이너(ScrollView/FlatList)는 넘치는 게 정상이다
        var scrollableY = overY === 'auto' || overY === 'scroll'
        var scrollableX = overX === 'auto' || overX === 'scroll'
        var clamped = cs.webkitLineClamp && cs.webkitLineClamp !== 'none'
        var reason = null
        if (dy > 1 && !scrollableY) reason = clamped ? 'line-clamp' : 'height'
        else if (dx > 1 && !scrollableX && overX === 'hidden') reason = clamped ? 'line-clamp' : 'width'
        if (reason === null) continue
        out.push({
          reason: reason,
          selector: selector(el),
          text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40),
          overflow: overX + '/' + overY,
          box: Math.round(el.clientWidth) + 'x' + Math.round(el.clientHeight),
          content: Math.round(el.scrollWidth) + 'x' + Math.round(el.scrollHeight),
        })
      }
      return {
        pageScrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        items: out,
      }
    },

    /** 텍스트로 요소를 찾아 화면 좌표(중앙)를 준다 */
    locate: function (text, nth) {
      var wanted = String(text)
      var index = nth || 0
      var nodes = document.querySelectorAll('div,span,input,textarea,button,a')
      var hits = []
      for (var i = 0; i < nodes.length; i += 1) {
        var el = nodes[i]
        var own = (el.innerText || el.value || '').replace(/\s+/g, ' ').trim()
        if (own !== wanted) continue
        if (!visible(el)) continue
        // 가장 안쪽 것만 — 같은 글자를 감싼 조상들이 전부 걸린다
        var inner = false
        for (var j = 0; j < hits.length; j += 1) if (hits[j].contains(el)) { hits[j] = el; inner = true; break }
        if (!inner) hits.push(el)
      }
      var target = hits[index]
      if (!target) return null
      var rect = target.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    },

    seen: function (text) {
      return (document.body.innerText || '').indexOf(String(text)) >= 0
    },
  }
})()
`

// ── 시나리오 ────────────────────────────────────────────────────────────────

/**
 * 화면 상태 하나 = 시나리오 하나. `steps`는 실제 마우스 클릭으로 상태를 만든다
 * (RNW의 Pressable은 responder(pointer) 이벤트를 쓰므로 `el.click()`으로는 안 눌린다).
 */
const SCENARIOS = [
  { id: 'home', title: '홈', path: '/' },
  { id: 'home-info', title: '홈 — 데모 정보 시트', path: '/', steps: [{ click: '이 데모 정보' }] },
  {
    id: 'symposia',
    title: 'Symposia — 자막 시청',
    path: '/session/keynote-01',
    start: 'keynote-01',
    steps: [{ waitFor: '안녕하세요' }],
  },
  {
    id: 'symposia-stage',
    title: 'Symposia — 스테이지 모드',
    path: '/session/keynote-01',
    start: 'keynote-01',
    steps: [{ waitFor: '안녕하세요' }, { click: '스테이지 모드' }],
  },
  { id: 'caretalk-role', title: 'CareTalk — 역할 선택', path: '/room' },
  {
    id: 'caretalk-language',
    title: 'CareTalk — 언어 선택',
    path: '/room',
    steps: [{ click: '새 대화 시작' }, { waitFor: '사용할 언어를 선택하세요' }],
  },
  {
    id: 'caretalk-waiting',
    title: 'CareTalk — 환자 입장 대기',
    path: '/room',
    steps: [
      { click: '새 대화 시작' },
      { waitFor: '사용할 언어를 선택하세요' },
      { click: '계속' },
      { waitFor: '환자 입장을 기다리는 중' },
    ],
  },
  {
    id: 'caretalk-conversation',
    title: 'CareTalk — 대화 + 퀵리플라이',
    path: '/room',
    steps: [
      { click: '새 대화 시작' },
      { waitFor: '사용할 언어를 선택하세요' },
      { click: '계속' },
      { waitFor: '환자 입장을 기다리는 중' },
      { click: '대화 화면으로' },
      { waitFor: '자주 쓰는 문구' },
    ],
  },
  {
    id: 'caretalk-join',
    title: 'CareTalk — 환자 코드 입장',
    path: '/room',
    steps: [
      { click: '초대 코드로 입장' },
      { waitFor: '사용할 언어를 선택하세요' },
      { click: '계속' },
      { waitFor: '초대 코드를 입력하세요' },
    ],
  },
  { id: 'console-list', title: '콘솔 — 세션 목록', path: '/console', steps: [{ waitFor: '세션' }] },
  {
    id: 'console-create',
    title: '콘솔 — 새 세션 폼',
    path: '/console',
    steps: [{ waitFor: '세션' }, { click: '＋ 새 세션' }, { waitFor: '세션 제목' }],
  },
  {
    id: 'console-detail',
    title: '콘솔 — 세션 상세(운영)',
    path: '/console',
    start: 'keynote-01',
    steps: [
      { waitFor: 'Recent Advances in Laser Toning' },
      { click: 'Recent Advances in Laser Toning' },
      { waitFor: '입장 코드' },
    ],
  },
  { id: 'admin', title: '관리자', path: '/admin', steps: [{ waitFor: '상담 현황' }] },
]

// ── 실행 ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const distDir = resolve(appRoot, args.dist)
  const chromePath = process.env.CHROME_PATH ?? DEFAULT_CHROME
  const userDataDir = mkdtempSync(join(tmpdir(), 'a11y-audit-'))
  const cleanups = []
  const axeSource = readFileSync(AXE_PATH, 'utf8')

  assertBundleTargets(distDir, args.apiPort)

  try {
    // 1. 목 서버
    const mock = spawn('pnpm', ['--filter', '@thegame/mock-server', 'exec', 'tsx', 'src/server.ts'], {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(args.apiPort) },
      detached: true,
    })
    mock.stderr.on('data', (chunk) => process.stderr.write(`[mock] ${chunk}`))
    // pnpm이 tsx를 다시 스폰하므로 프로세스 그룹째 정리한다 — 안 그러면 목 서버가 남는다
    cleanups.push(() => process.kill(-mock.pid, 'SIGTERM'))
    await waitForHttp(`http://127.0.0.1:${args.apiPort}/api/sessions`, 30_000)
    console.log(`[a11y] 목 서버 :${args.apiPort}`)

    // 2. 정적 서버
    const web = spawn(process.execPath, [
      resolve(appRoot, 'scripts/serve-web.mjs'),
      distDir,
      String(args.webPort),
    ])
    web.stderr.on('data', (chunk) => process.stderr.write(`[serve-web] ${chunk}`))
    cleanups.push(() => web.kill('SIGTERM'))
    await waitForHttp(`http://127.0.0.1:${args.webPort}/index.html`, 15_000)
    console.log(`[a11y] 정적 서버 :${args.webPort} (${distDir})`)

    // 3. 크로미움
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
    cleanups.push(() => chrome.kill('SIGTERM'))

    const version = await waitForHttp(`http://127.0.0.1:${args.cdpPort}/json/version`, 20_000, true)
    const cdp = await Cdp.connect(version.webSocketDebuggerUrl)
    cleanups.push(() => cdp.close())

    const { targetInfos } = await cdp.send('Target.getTargets')
    const page = targetInfos.find((target) => target.type === 'page')
    const { sessionId } = await cdp.send('Target.attachToTarget', {
      targetId: page.targetId,
      flatten: true,
    })

    const pageErrors = []
    cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
      pageErrors.push(exceptionDetails.exception?.description ?? exceptionDetails.text)
    })
    if (process.env.A11Y_DEBUG === '1') {
      cdp.on('Runtime.consoleAPICalled', ({ type, args: callArgs }) => {
        const text = (callArgs ?? []).map((a) => a.value ?? a.description ?? a.type).join(' ')
        console.log(`[page:${type}] ${text}`)
      })
    }

    await cdp.send('Page.enable', {}, sessionId)
    await cdp.send('Runtime.enable', {}, sessionId)
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      { width: args.width, height: args.height, deviceScaleFactor: 1, mobile: true },
      sessionId,
    )
    // 앱은 OS 다크 설정을 따른다(useColorScheme) — 다크 팔레트도 같은 검사를 받아야 한다
    await cdp.send(
      'Emulation.setEmulatedMedia',
      { features: [{ name: 'prefers-color-scheme', value: args.scheme }] },
      sessionId,
    )
    console.log(`[a11y] prefers-color-scheme: ${args.scheme}`)

    const evaluate = async (expression) => {
      const { result, exceptionDetails } = await cdp.send(
        'Runtime.evaluate',
        { expression, returnByValue: true, awaitPromise: true },
        sessionId,
      )
      if (exceptionDetails) throw new Error(`페이지 평가 실패: ${exceptionDetails.text}`)
      return result.value
    }

    const clickAt = async (x, y) => {
      for (const type of ['mousePressed', 'mouseReleased']) {
        await cdp.send(
          'Input.dispatchMouseEvent',
          { type, x, y, button: 'left', clickCount: 1, buttons: type === 'mousePressed' ? 1 : 0 },
          sessionId,
        )
      }
    }

    const waitFor = async (text, timeoutMs = 20_000) => {
      const deadline = Date.now() + timeoutMs
      for (;;) {
        if (await evaluate(`window.__a11y.seen(${JSON.stringify(text)})`)) return
        if (Date.now() > deadline) {
          const body = await evaluate('(document.body.innerText || "").slice(0, 600)')
          throw new Error(`화면에 "${text}"가 나타나지 않았다 — 화면 내용:\n${body}`)
        }
        await sleep(200)
      }
    }

    const only = args.only === '' ? null : new Set(args.only.split(','))
    const results = []

    for (const scenario of SCENARIOS) {
      if (only !== null && !only.has(scenario.id)) continue
      console.log(`\n[a11y] ${scenario.id} — ${scenario.title}`)

      if (scenario.start !== undefined) {
        await fetch(`http://127.0.0.1:${args.apiPort}/api/sessions/${scenario.start}/start`, {
          method: 'POST',
        }).catch(() => null)
      }

      await cdp.send(
        'Page.navigate',
        { url: `http://localhost:${args.webPort}${scenario.path}` },
        sessionId,
      )
      await sleep(1200)
      await evaluate(PROBE)
      await evaluate(axeSource)

      for (const step of scenario.steps ?? []) {
        if (step.waitFor !== undefined) {
          await waitFor(step.waitFor)
          continue
        }
        const point = await evaluate(
          `window.__a11y.locate(${JSON.stringify(step.click)}, ${step.nth ?? 0})`,
        )
        if (point === null) throw new Error(`"${step.click}"를 찾지 못했다 (${scenario.id})`)
        await clickAt(point.x, point.y)
        await sleep(700)
      }
      await sleep(500)

      // axe-core — product 감사와 같은 규칙 집합
      const axe = await evaluate(`
        axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice'] },
          resultTypes: ['violations'],
        }).then((r) => JSON.stringify({
          violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length,
            sample: v.nodes.slice(0, 3).map((n) => ({ target: n.target.join(' '), summary: (n.failureSummary || '').replace(/\\s+/g, ' ').slice(0, 200) })) })),
        }))
      `)
      const axeResult = JSON.parse(axe)
      const violationCount = axeResult.violations.reduce((sum, v) => sum + v.nodes, 0)

      const targets = await evaluate('JSON.stringify(window.__a11y.targets())').then(JSON.parse)
      const small = targets.filter((t) => t.small)
      const unnamed = targets.filter((t) => !t.hasName)

      const fontScale = {}
      for (const k of FONT_SCALES) {
        await evaluate(`window.__a11y.setFontScale(${k})`)
        await sleep(250)
        fontScale[k] = await evaluate('JSON.stringify(window.__a11y.clipped())').then(JSON.parse)
      }
      await evaluate('window.__a11y.setFontScale(1)')

      console.log(
        `  axe 위반 ${violationCount}건 (${axeResult.violations.map((v) => `${v.id}×${v.nodes}`).join(', ') || '없음'})`,
      )
      console.log(
        `  인터랙티브 ${targets.length}개 · 44pt 미만 ${small.length}개 · 이름 없음 ${unnamed.length}개`,
      )
      console.log(
        `  글자 확대 잘림: ${FONT_SCALES.map((k) => `${k}× ${fontScale[k].items.length}`).join(' / ')}` +
          ` · 가로 넘침 ${FONT_SCALES.map((k) => fontScale[k].pageScrollX).join('/')}`,
      )

      results.push({
        id: scenario.id,
        title: scenario.title,
        axe: axeResult,
        axeViolationCount: violationCount,
        targets,
        small,
        unnamed,
        fontScale,
      })
    }

    const report = {
      label: args.label,
      scheme: args.scheme,
      generatedAt: new Date().toISOString(),
      pageErrors,
      results,
    }
    const totals = {
      axe: results.reduce((sum, r) => sum + r.axeViolationCount, 0),
      targets: results.reduce((sum, r) => sum + r.targets.length, 0),
      small: results.reduce((sum, r) => sum + r.small.length, 0),
      unnamed: results.reduce((sum, r) => sum + r.unnamed.length, 0),
    }
    console.log(
      `\n══ ${args.label} ══\naxe 위반 합계 ${totals.axe} · 44pt 미만 ${totals.small} · 이름 없는 컨트롤 ${totals.unnamed}`,
    )
    if (pageErrors.length > 0) console.log(`페이지 예외: ${pageErrors.join(' / ')}`)

    if (args.out !== '') {
      writeFileSync(args.out, JSON.stringify(report, null, 2))
      console.log(`원자료: ${args.out}`)
    }
  } finally {
    for (const cleanup of cleanups.reverse()) {
      try {
        cleanup()
      } catch {
        // 정리 중 실패는 측정 결과를 덮지 않는다
      }
    }
  }
}

await main()
