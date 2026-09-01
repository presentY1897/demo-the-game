const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// pnpm 모노레포: 워크스페이스 패키지(@thegame/*)의 TS 소스를 감시·해석한다 (ADR-0001/0004)
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

/**
 * 성능 측정 전용 스위치 (S08 / docs/perf/001-자막-리렌더.md).
 *
 * `PROFILE_REACT=1`이면 react-dom을 **프로파일링 빌드**로 바꾼다. 이 빌드만
 * 파이버에 `actualDuration`(커밋 렌더 시간)을 기록해서, 배포와 같은
 * production 번들에서 커밋 시간을 실측할 수 있다. 기본 빌드는 영향을 받지 않는다.
 *
 * `react-dom`과 `react-dom/client`를 **함께** 돌려야 한다 — 하나만 바꾸면
 * 리액트 리컨사일러가 두 벌 들어간다(react-native-web은 client에서 createRoot를 쓴다).
 * 단 react-dom 패키지 **내부의** `require('react-dom')`(공유 internals)은 그대로 둔다 —
 * 여기까지 돌리면 순환 참조가 되어 `ReactDOMSharedInternals.d`가 undefined가 된다.
 */
if (process.env.PROFILE_REACT === '1') {
  const inner = config.resolver.resolveRequest
  const profiled = new Set(['react-dom', 'react-dom/client'])
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const resolveWith = inner ?? context.resolveRequest
    const fromReactDom = (context.originModulePath ?? '').includes(`${path.sep}react-dom${path.sep}`)
    if (profiled.has(moduleName) && !fromReactDom) {
      return resolveWith(context, 'react-dom/profiling', platform)
    }
    return resolveWith(context, moduleName, platform)
  }
}

module.exports = config
