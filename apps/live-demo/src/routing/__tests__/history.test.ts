import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setBackStrategy, useNav } from '../../navigation'
import { connectHistory, type HistoryEnv } from '../history'

/**
 * 브라우저 히스토리 스택을 그대로 흉내 낸다 — pushState는 앞쪽을 잘라내고 쌓고,
 * back()은 인덱스를 뒤로 옮기며 popstate를 쏜다.
 */
function fakeEnv(initialPath = '/') {
  const entries = [initialPath]
  let index = 0
  const listeners = new Set<() => void>()

  const env: HistoryEnv = {
    history: {
      pushState: (_data, _unused, url) => {
        entries.splice(index + 1)
        entries.push(url)
        index = entries.length - 1
      },
      replaceState: (_data, _unused, url) => {
        entries[index] = url
      },
      back: () => {
        if (index === 0) return
        index -= 1
        for (const listener of listeners) listener()
      },
    },
    location: {
      get pathname() {
        return entries[index] ?? '/'
      },
    },
    addEventListener: (_type, listener) => void listeners.add(listener),
    removeEventListener: (_type, listener) => void listeners.delete(listener),
  }

  return {
    env,
    path: () => entries[index] ?? '/',
    stack: () => [...entries],
    listenerCount: () => listeners.size,
  }
}

const route = () => useNav.getState().route

let disconnect: (() => void) | null = null

beforeEach(() => {
  useNav.setState({ route: { name: 'home' }, mode: 'replace' })
  setBackStrategy(null)
})

afterEach(() => {
  disconnect?.()
  disconnect = null
})

describe('초기 진입', () => {
  it('URL을 파싱해 그 화면으로 직행한다 (새로고침해도 같은 화면)', () => {
    const fake = fakeEnv('/session/keynote-01')

    disconnect = connectHistory(fake.env)

    expect(route()).toEqual({ name: 'symposia', sessionId: 'keynote-01' })
    expect(fake.path()).toBe('/session/keynote-01')
  })

  it('초대 링크는 방 코드를 그대로 들고 들어온다', () => {
    const fake = fakeEnv('/room/k7qf2m')

    disconnect = connectHistory(fake.env)

    expect(route()).toEqual({ name: 'caretalk', inviteCode: 'K7QF2M' })
  })

  it('모르는 경로는 홈으로 보내고 주소창도 함께 정리한다 (히스토리는 쌓지 않는다)', () => {
    const fake = fakeEnv('/nope')

    disconnect = connectHistory(fake.env)

    expect(route()).toEqual({ name: 'home' })
    expect(fake.stack()).toEqual(['/'])
  })
})

describe('navigate ↔ URL', () => {
  it('navigate는 주소창을 갱신하고 히스토리를 한 칸 쌓는다', () => {
    const fake = fakeEnv('/')
    disconnect = connectHistory(fake.env)

    useNav.getState().navigate({ name: 'symposia', sessionId: 'keynote-01' })

    expect(fake.path()).toBe('/session/keynote-01')
    expect(fake.stack()).toEqual(['/', '/session/keynote-01'])
  })

  it('replace는 히스토리를 쌓지 않고 주소만 바꾼다 (방 생성 후 코드 URL)', () => {
    const fake = fakeEnv('/')
    disconnect = connectHistory(fake.env)
    useNav.getState().navigate({ name: 'caretalk' })

    useNav.getState().replace({ name: 'caretalk', inviteCode: 'K7QF2M' })

    expect(fake.stack()).toEqual(['/', '/room/K7QF2M'])
  })

  it('콘솔·관리자 라우트도 같은 규칙을 탄다', () => {
    const fake = fakeEnv('/')
    disconnect = connectHistory(fake.env)

    useNav.getState().navigate({ name: 'console' })
    expect(fake.path()).toBe('/console')

    useNav.getState().navigate({ name: 'admin' })
    expect(fake.path()).toBe('/admin')
  })
})

describe('뒤로가기', () => {
  it('브라우저 뒤로가기(popstate)가 라우트를 되돌린다', () => {
    const fake = fakeEnv('/')
    disconnect = connectHistory(fake.env)
    useNav.getState().navigate({ name: 'symposia', sessionId: 'keynote-01' })

    fake.env.history.back()

    expect(route()).toEqual({ name: 'home' })
    expect(fake.path()).toBe('/')
  })

  it('popstate 반영은 히스토리를 다시 쌓지 않는다', () => {
    const fake = fakeEnv('/')
    disconnect = connectHistory(fake.env)
    useNav.getState().navigate({ name: 'symposia', sessionId: 'keynote-01' })

    fake.env.history.back()

    expect(fake.stack()).toEqual(['/', '/session/keynote-01'])
  })

  it('앱 내 back은 브라우저 뒤로가기와 같은 동작이다', () => {
    const fake = fakeEnv('/')
    disconnect = connectHistory(fake.env)
    useNav.getState().navigate({ name: 'caretalk', inviteCode: 'K7QF2M' })

    useNav.getState().back()

    expect(route()).toEqual({ name: 'home' })
    expect(fake.path()).toBe('/')
  })

  it('링크로 바로 들어온 첫 화면에서는 앱 밖으로 나가지 않고 홈으로 간다', () => {
    const fake = fakeEnv('/room/K7QF2M')
    disconnect = connectHistory(fake.env)

    useNav.getState().back()

    expect(route()).toEqual({ name: 'home' })
    expect(fake.stack()).toEqual(['/room/K7QF2M', '/'])
  })
})

describe('해제', () => {
  it('해제하면 구독·리스너·back 전략을 모두 놓는다', () => {
    const fake = fakeEnv('/')
    const stop = connectHistory(fake.env)

    stop()
    useNav.getState().navigate({ name: 'console' })

    expect(fake.listenerCount()).toBe(0)
    expect(fake.path()).toBe('/')
  })
})
