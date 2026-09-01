import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Route } from '../../navigation'
import {
  clearLastVisit,
  LAST_VISIT_KEY,
  loadLastVisit,
  parseLastVisit,
  saveLastVisit,
  serializeLastVisit,
  type LastVisit,
  type StorageLike,
} from '../lastVisit'

function memoryStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

/** 사파리 프라이빗 모드처럼 접근 자체가 던지는 저장소 */
function throwingStorage(): StorageLike {
  const boom = (): never => {
    throw new Error('QuotaExceededError')
  }
  return { getItem: boom, setItem: boom, removeItem: boom }
}

const visit = (route: Route, role: LastVisit['role'] = null, lang: string | null = null): LastVisit => ({
  route,
  role,
  lang,
})

describe('직렬화 왕복', () => {
  it.each<LastVisit>([
    visit({ name: 'symposia', sessionId: 'keynote-01' }),
    visit({ name: 'caretalk', inviteCode: 'K7QF2M' }, 'staff', 'ko'),
    visit({ name: 'caretalk', inviteCode: 'K7QF2M' }, 'patient', 'vi'),
    visit({ name: 'home' }, null, 'en'),
  ])('저장했다 되읽으면 같은 값이다', (value) => {
    expect(parseLastVisit(serializeLastVisit(value))).toEqual(value)
  })

  it('알 수 없는 형식은 조용히 버린다 — 옛 버전 값이 남아 있어도 앱이 멀쩡해야 한다', () => {
    expect(parseLastVisit(null)).toBeNull()
    expect(parseLastVisit('')).toBeNull()
    expect(parseLastVisit('v0|/room/ABC||')).toBeNull()
    expect(parseLastVisit('쓰레기')).toBeNull()
  })

  it('역할 자리에 모르는 값이 있으면 역할 없음으로 읽는다', () => {
    expect(parseLastVisit('v1|/room/K7QF2M|doctor|ko')?.role).toBeNull()
  })
})

describe('storage 연동', () => {
  let storage: ReturnType<typeof memoryStorage>

  beforeEach(() => {
    storage = memoryStorage()
  })

  it('저장한 방문을 다시 읽는다', () => {
    const value = visit({ name: 'caretalk', inviteCode: 'K7QF2M' }, 'staff', 'ko')

    saveLastVisit(storage, value)

    expect(storage.map.has(LAST_VISIT_KEY)).toBe(true)
    expect(loadLastVisit(storage)).toEqual(value)
  })

  it('지우면 더 이상 제안하지 않는다', () => {
    saveLastVisit(storage, visit({ name: 'symposia', sessionId: 'keynote-01' }))

    clearLastVisit(storage)

    expect(loadLastVisit(storage)).toBeNull()
  })

  it('저장소가 없는 플랫폼에서는 아무 일도 하지 않는다', () => {
    expect(() => saveLastVisit(null, visit({ name: 'home' }))).not.toThrow()
    expect(loadLastVisit(null)).toBeNull()
    expect(() => clearLastVisit(null)).not.toThrow()
  })

  it('storage가 예외를 던져도 앱은 계속 간다 (경고만 남긴다)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const hostile = throwingStorage()

    expect(() => saveLastVisit(hostile, visit({ name: 'home' }))).not.toThrow()
    expect(loadLastVisit(hostile)).toBeNull()
    expect(() => clearLastVisit(hostile)).not.toThrow()
    expect(warn).toHaveBeenCalledTimes(3)

    warn.mockRestore()
  })
})
