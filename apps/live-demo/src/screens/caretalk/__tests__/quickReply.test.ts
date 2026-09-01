import { describe, expect, it, vi } from 'vitest'
import { quickRepliesFor } from '@thegame/i18n'
import { createQuickReplyHandlers, insertIntoDraft, nextCollapsed } from '../quickReply'

/**
 * 칩 동작의 단위 테스트 (S05).
 * RN 컴포넌트 렌더는 범위 밖이라, 컴포넌트가 그대로 호출하는 핸들러 로직을 검증한다.
 */

function harness(draft = '') {
  const say = vi.fn()
  const setDraft = vi.fn()
  const focusInput = vi.fn()
  const handlers = createQuickReplyHandlers({ say, draft, setDraft, focusInput })
  return { say, setDraft, focusInput, ...handlers }
}

describe('탭 → 즉시 전송', () => {
  it('칩을 탭하면 편집 단계 없이 바로 보낸다', () => {
    const { onTap, say, setDraft } = harness()

    onTap('열이 나요.')

    expect(say).toHaveBeenCalledExactlyOnceWith('열이 나요.')
    expect(setDraft).not.toHaveBeenCalled()
  })

  it('쓰던 초안이 있어도 탭 전송은 초안을 건드리지 않는다', () => {
    const { onTap, say, setDraft } = harness('쓰다 만 문장')

    onTap('감사합니다.')

    expect(say).toHaveBeenCalledExactlyOnceWith('감사합니다.')
    expect(setDraft).not.toHaveBeenCalled()
  })

  it('빈 문구는 보내지 않는다 (빈 말풍선 방지)', () => {
    const { onTap, say } = harness()

    onTap('   ')

    expect(say).not.toHaveBeenCalled()
  })
})

describe('길게 누르기 → 입력창 삽입', () => {
  it('전송하지 않고 입력창에 넣은 뒤 포커스를 옮긴다', () => {
    const { onLongPress, say, setDraft, focusInput } = harness()

    onLongPress('여기가 아파요.')

    expect(say).not.toHaveBeenCalled()
    expect(setDraft).toHaveBeenCalledExactlyOnceWith('여기가 아파요.')
    expect(focusInput).toHaveBeenCalledOnce()
  })

  it('쓰던 초안 뒤에 이어 붙인다 — 덮어쓰지 않는다', () => {
    const { onLongPress, setDraft } = harness('어제부터')

    onLongPress('여기가 아파요.')

    expect(setDraft).toHaveBeenCalledExactlyOnceWith('어제부터 여기가 아파요.')
  })

  it('초안 끝의 공백은 한 칸으로 정리된다', () => {
    expect(insertIntoDraft('어제부터   ', '여기가 아파요.')).toBe('어제부터 여기가 아파요.')
    expect(insertIntoDraft('', '여기가 아파요.')).toBe('여기가 아파요.')
  })

  it('빈 문구를 길게 눌러도 아무 일도 일어나지 않는다', () => {
    const { onLongPress, setDraft, focusInput } = harness('그대로')

    onLongPress('  ')

    expect(setDraft).not.toHaveBeenCalled()
    expect(focusInput).not.toHaveBeenCalled()
  })
})

describe('칩 영역 접힘', () => {
  it('입력창에 포커스가 가면 접힌다', () => {
    expect(nextCollapsed('focus', false, '')).toBe(true)
  })

  it('초안 없이 포커스를 잃으면 다시 펼친다', () => {
    expect(nextCollapsed('blur', true, '')).toBe(false)
  })

  it('쓰다 만 초안이 있으면 접은 채로 둔다 — 화면이 흔들리지 않게', () => {
    expect(nextCollapsed('blur', true, '증상을 설명하는 중')).toBe(true)
  })

  it('토글은 현재 상태를 뒤집는다', () => {
    expect(nextCollapsed('toggle', false, '')).toBe(true)
    expect(nextCollapsed('toggle', true, '초안 있음')).toBe(false)
  })
})

describe('역할·언어별 문구 세트', () => {
  it('환자와 의료진은 서로 다른 문구를 본다', () => {
    const patient = quickRepliesFor('patient', 'en').flatMap((group) => group.chips)
    const staff = quickRepliesFor('staff', 'en').flatMap((group) => group.chips)

    expect(patient.length).toBeGreaterThanOrEqual(8)
    expect(staff.length).toBeGreaterThanOrEqual(8)
    expect(patient.map((chip) => chip.text)).not.toEqual(
      expect.arrayContaining(staff.map((chip) => chip.text)),
    )
  })

  it('언어를 바꾸면 같은 칩이 그 언어 문장으로 바뀐다', () => {
    const en = quickRepliesFor('patient', 'en')
    const ja = quickRepliesFor('patient', 'ja')

    expect(ja.map((group) => group.group)).toEqual(en.map((group) => group.group))
    expect(en[1]?.chips[0]?.text).toBe('I have a fever.')
    expect(ja[1]?.chips[0]?.text).toBe('熱があります。')
    expect(ja[1]?.chips[0]?.id).toBe(en[1]?.chips[0]?.id)
  })

  it('환자는 인사 → 증상을 두 번의 탭으로 끝낼 수 있다 (완성 기준 1)', () => {
    const groups = quickRepliesFor('patient', 'en')
    const greeting = groups[0]?.chips[0]
    const symptom = groups[1]?.chips[0]

    expect(greeting?.id).toBe('greeting')
    expect(symptom?.id).toBe('fever')

    const { onTap, say } = harness()
    onTap(greeting?.text ?? '')
    onTap(symptom?.text ?? '')

    expect(say).toHaveBeenCalledTimes(2)
    expect(say.mock.calls.map(([text]) => text)).toEqual(['Hello.', 'I have a fever.'])
  })

  it('문구가 없는 언어에서는 칩을 내지 않는다 (번역 보장 밖)', () => {
    expect(quickRepliesFor('patient', 'zh')).toEqual([])
  })
})
