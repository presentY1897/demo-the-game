/**
 * 자막 리렌더 계측기 (docs/perf/001-자막-리렌더.md).
 *
 * 페이지의 **어떤 스크립트보다 먼저** 주입된다(`Page.addScriptToEvaluateOnNewDocument`).
 * 두 가지를 기록한다.
 *
 *  1. SSE 이벤트 도착 — `EventSource`를 감싸 부분/확정 자막의 도착 시각을 남긴다.
 *  2. React 커밋 — DevTools 훅 자리에 계측용 훅을 꽂아, 커밋마다 파이버 트리를 훑어
 *     **이번 커밋에서 실제로 렌더된 컴포넌트**를 센다.
 *
 * "렌더됐다"의 판정은 React DevTools와 같은 기준인 `PerformedWork` 플래그(=1)다.
 * memo로 걸러진(bailout) 컴포넌트는 파이버를 방문해도 이 플래그가 서지 않는다 —
 * 즉 "커밋에 포함된 컴포넌트 수"가 memo 효과를 그대로 반영한다.
 *
 * 커밋 시간은 루트 파이버의 `actualDuration`(= React DevTools 프로파일러가 커밋
 * 시간으로 쓰는 값)이다. 이 값은 **프로파일링 빌드에서만** 기록되므로,
 * `PROFILE_REACT=1`로 빌드하지 않으면 아래에서 오류로 잡힌다(무음 실패 금지).
 */
;(function installCaptionPerfProbe() {
  /** React 19의 PerformedWork 플래그 — 이 파이버가 이번 커밋에서 실제로 일했다 */
  var PERFORMED_WORK = 1

  var state = {
    /** SSE 이벤트: { kind, t } */
    events: [],
    /** 커밋: { t, dur, rendered, total, rows, renderedRows, eventIndex, counts } */
    commits: [],
    ended: false,
    injected: false,
    errors: [],
  }
  window.__captionPerf = state

  // ── 1. SSE 이벤트 도착 시각 ──────────────────────────────────────────────
  var NativeEventSource = window.EventSource
  if (typeof NativeEventSource === 'function') {
    var ProbedEventSource = function (url, config) {
      var source = new NativeEventSource(url, config)
      // 앱이 onmessage를 붙이기 전에 등록되므로 항상 먼저 실행된다
      source.addEventListener('message', function (event) {
        var data = typeof event.data === 'string' ? event.data : ''
        // 계측기가 무거우면 측정 대상을 왜곡한다 — JSON 파싱 대신 문자열 판별만 한다
        var kind = 'other'
        if (data.indexOf('"type":"caption"') !== -1) {
          kind = data.indexOf('"isFinal":true') !== -1 ? 'final' : 'partial'
        } else if (data.indexOf('"type":"session-ended"') !== -1) {
          kind = 'ended'
          state.ended = true
        } else if (data.indexOf('"type":"session"') !== -1) {
          kind = 'session'
        } else if (data.indexOf('"type":"heartbeat"') !== -1) {
          kind = 'heartbeat'
        }
        state.events.push({ kind: kind, t: performance.now() })
      })
      return source
    }
    ProbedEventSource.prototype = NativeEventSource.prototype
    ProbedEventSource.CONNECTING = 0
    ProbedEventSource.OPEN = 1
    ProbedEventSource.CLOSED = 2
    window.EventSource = ProbedEventSource
  } else {
    state.errors.push('EventSource 없음 — SSE 이벤트를 기록할 수 없다')
  }

  // ── 2. 커밋마다 렌더된 컴포넌트 세기 ────────────────────────────────────
  function nameOf(fiber) {
    var type = fiber.type
    if (typeof type === 'string') return type
    if (typeof type === 'function') return type.displayName || type.name || 'Anonymous'
    if (type !== null && typeof type === 'object') {
      if (typeof type.displayName === 'string') return type.displayName
      var inner = type.type || type.render
      if (typeof inner === 'function') return inner.displayName || inner.name || 'Anonymous'
      if (typeof inner === 'object' && inner !== null && typeof inner.name === 'string') {
        return inner.name
      }
    }
    if (fiber.tag === 6) return '#text'
    if (fiber.tag === 3) return '#root'
    return 'tag:' + fiber.tag
  }

  function record(root) {
    var t = performance.now()
    var current = root.current
    if (typeof current.actualDuration !== 'number') {
      if (state.errors.length === 0) {
        state.errors.push(
          'actualDuration 없음 — 프로파일링 빌드가 아니다 (PROFILE_REACT=1로 빌드해라)',
        )
      }
      return
    }

    var counts = {}
    var rendered = 0
    var total = 0
    var rows = 0
    var renderedRows = 0

    // 스택 DFS. `live`는 "이 파이버가 이번 렌더에서 실제로 방문됐는가"다.
    //
    // 통째로 bailout된 서브트리는 파이버 객체가 재사용되므로 **flags가 지난 커밋의
    // 값 그대로 남아 있다** — 그걸 그대로 세면 memo/bailout 효과가 안 보인다.
    // React DevTools와 같은 기준으로, 부모의 자식 포인터가 그대로면
    // (`fiber.child === fiber.alternate.child`) 그 아래는 이번에 렌더되지 않은 것으로
    // 보고 내려가지 않는다. 마운트 수(total/rows)는 트리 전체를 그대로 센다.
    var nodes = [current]
    var lives = [true]

    while (nodes.length > 0) {
      var node = nodes.pop()
      var live = lives.pop()
      total += 1
      var name = nameOf(node)
      var did = live && (node.flags & PERFORMED_WORK) !== 0
      if (name === 'CaptionRow') {
        rows += 1
        if (did) renderedRows += 1
      }
      if (did) {
        rendered += 1
        counts[name] = (counts[name] || 0) + 1
      }
      var previous = node.alternate
      var childLive = live && (previous === null || node.child !== previous.child)
      var child = node.child
      while (child !== null) {
        nodes.push(child)
        lives.push(childLive)
        child = child.sibling
      }
    }

    state.commits.push({
      t: t,
      dur: current.actualDuration,
      rendered: rendered,
      total: total,
      rows: rows,
      renderedRows: renderedRows,
      eventIndex: state.events.length - 1,
      counts: counts,
    })
  }

  var hook = {
    renderers: new Map(),
    supportsFiber: true,
    isDisabled: false,
    checkDCE: function () {},
    inject: function (internals) {
      state.injected = true
      hook.renderers.set(1, internals)
      return 1
    },
    onCommitFiberRoot: function (_id, root) {
      try {
        record(root)
      } catch (error) {
        state.errors.push('커밋 기록 실패: ' + String(error))
      }
    },
    onPostCommitFiberRoot: function () {},
    onCommitFiberUnmount: function () {},
    setStrictMode: function () {},
  }

  Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
    value: hook,
    configurable: true,
    writable: true,
  })
})()
