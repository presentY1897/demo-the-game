import { describe, expect, it } from 'vitest'
import { resolveSessionCode } from '../code'

const sessions = [{ id: 'keynote-01' }, { id: 'panel-02' }]

describe('resolveSessionCode', () => {
  it('열려 있는 세션 id를 그대로 코드로 받는다', () => {
    expect(resolveSessionCode('keynote-01', sessions)).toEqual({
      ok: true,
      sessionId: 'keynote-01',
    })
  })

  it('대소문자와 앞뒤 공백을 흡수한다 (장내 게시물을 보고 받아 적는 값)', () => {
    expect(resolveSessionCode('  KEYNOTE-01 ', sessions)).toEqual({
      ok: true,
      sessionId: 'keynote-01',
    })
  })

  it('빈 값은 "없는 코드"가 아니라 "입력 안 함"으로 구분한다', () => {
    expect(resolveSessionCode('', sessions)).toEqual({ ok: false, reason: 'empty' })
    expect(resolveSessionCode('   ', sessions)).toEqual({ ok: false, reason: 'empty' })
  })

  it('목록에 없는 코드는 unknown — 스트림을 열어보기 전에 걸러진다', () => {
    expect(resolveSessionCode('keynote-99', sessions)).toEqual({ ok: false, reason: 'unknown' })
  })

  it('세션 목록을 아직 못 받았으면 어떤 코드도 통과하지 않는다', () => {
    expect(resolveSessionCode('keynote-01', [])).toEqual({ ok: false, reason: 'unknown' })
  })
})
