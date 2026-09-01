import { describe, expect, it } from 'vitest'
import type { Route } from '../../navigation'
import { normalizeInviteCode, normalizeSessionCode, parsePath, routeToPath, routeToUrl } from '../url'

const routes: Route[] = [
  { name: 'home' },
  { name: 'symposia', sessionId: 'keynote-01' },
  { name: 'caretalk' },
  { name: 'caretalk', inviteCode: 'K7QF2M' },
  { name: 'console' },
  { name: 'admin' },
]

describe('URL ↔ 라우트 왕복', () => {
  it.each(routes)('$name 라우트는 직렬화 후 다시 파싱해도 같다', (route) => {
    expect(parsePath(routeToPath(route))).toEqual(route)
  })

  it('경로가 라우트로, 라우트가 같은 경로로 되돌아온다', () => {
    const paths = ['/', '/session/keynote-01', '/room', '/room/K7QF2M', '/console', '/admin']
    for (const path of paths) {
      expect(routeToPath(parsePath(path))).toBe(path)
    }
  })
})

describe('parsePath', () => {
  it('모르는 경로는 홈으로 떨어진다 — 빈 화면을 만들지 않는다', () => {
    expect(parsePath('/nope')).toEqual({ name: 'home' })
    expect(parsePath('/session')).toEqual({ name: 'home' })
    expect(parsePath('')).toEqual({ name: 'home' })
  })

  it('쿼리스트링과 해시는 무시한다', () => {
    expect(parsePath('/session/keynote-01?lang=en#top')).toEqual({
      name: 'symposia',
      sessionId: 'keynote-01',
    })
  })

  it('초대 코드는 대문자로, 세션 코드는 소문자로 정규화한다', () => {
    expect(parsePath('/room/k7qf2m')).toEqual({ name: 'caretalk', inviteCode: 'K7QF2M' })
    expect(parsePath('/session/KEYNOTE-01')).toEqual({ name: 'symposia', sessionId: 'keynote-01' })
  })

  it('앞뒤 슬래시가 더 있어도 같은 라우트다', () => {
    expect(parsePath('//room//K7QF2M//')).toEqual({ name: 'caretalk', inviteCode: 'K7QF2M' })
  })

  it('손상된 퍼센트 인코딩에도 죽지 않는다', () => {
    expect(parsePath('/room/%')).toEqual({ name: 'caretalk', inviteCode: '%' })
  })
})

describe('정규화 유틸', () => {
  it('초대 코드는 공백·소문자를 흡수한다 (환자가 손으로 적는 값)', () => {
    expect(normalizeInviteCode('  k7qf2m ')).toBe('K7QF2M')
  })

  it('세션 코드는 소문자 슬러그로 맞춘다', () => {
    expect(normalizeSessionCode(' Keynote-01 ')).toBe('keynote-01')
  })
})

describe('routeToUrl', () => {
  it('QR·공유용 절대 주소를 만든다', () => {
    expect(routeToUrl('https://demo.thegame.dev', { name: 'caretalk', inviteCode: 'K7QF2M' })).toBe(
      'https://demo.thegame.dev/room/K7QF2M',
    )
  })

  it('origin 끝의 슬래시가 겹치지 않는다', () => {
    expect(routeToUrl('http://localhost:8081/', { name: 'home' })).toBe('http://localhost:8081/')
  })
})
