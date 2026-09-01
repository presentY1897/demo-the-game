import { beforeEach, describe, expect, it } from 'vitest'
import type { ConversationEvent } from '@thegame/realtime'
import { useConversationStore } from '../conversationStore'

const message = (id: string, role: 'staff' | 'patient', text: string): ConversationEvent => ({
  type: 'message',
  id,
  role,
  lang: role === 'staff' ? 'ko' : 'en',
  text,
  translation: { lang: role === 'staff' ? 'en' : 'ko', text: `${text} (번역)` },
  ts: 1_700_000_000_000,
})

const dispatch = (...events: ConversationEvent[]): void => {
  for (const event of events) useConversationStore.getState().handleEvent(event)
}

const state = () => useConversationStore.getState()

describe('conversationStore', () => {
  beforeEach(() => {
    useConversationStore.getState().reset()
  })

  it('joined는 대화 상태를 건드리지 않는다', () => {
    const before = state()

    dispatch({ type: 'joined', roomId: 'r1', role: 'staff' })

    expect(state().messages).toBe(before.messages)
    expect(state().typingRole).toBeNull()
    expect(state().lastError).toBeNull()
  })

  it('message는 원문·번역을 함께 담아 순서대로 쌓는다', () => {
    dispatch(message('m1', 'staff', '어디가 불편하세요?'), message('m2', 'patient', 'My head'))

    expect(state().messages).toEqual([
      {
        id: 'm1',
        role: 'staff',
        text: '어디가 불편하세요?',
        translationText: '어디가 불편하세요? (번역)',
        ts: 1_700_000_000_000,
      },
      {
        id: 'm2',
        role: 'patient',
        text: 'My head',
        translationText: 'My head (번역)',
        ts: 1_700_000_000_000,
      },
    ])
  })

  it('typing은 역할을 세우고, 그 역할의 message가 오면 해제된다', () => {
    dispatch({ type: 'typing', role: 'patient' })
    expect(state().typingRole).toBe('patient')

    dispatch(message('m1', 'patient', 'Hello'))
    expect(state().typingRole).toBeNull()
  })

  it('typing은 마지막에 온 역할로 덮어쓴다', () => {
    dispatch({ type: 'typing', role: 'patient' }, { type: 'typing', role: 'staff' })

    expect(state().typingRole).toBe('staff')
  })

  it('error는 메시지를 lastError로 남기고 대화는 지우지 않는다', () => {
    dispatch(message('m1', 'staff', '안녕하세요'))

    dispatch({ type: 'error', code: 'room-full', message: '방 정원이 찼습니다' })

    expect(state().lastError).toBe('방 정원이 찼습니다')
    expect(state().messages).toHaveLength(1)
  })

  it('clearTyping은 타이핑 표시만 내린다', () => {
    dispatch(message('m1', 'staff', '안녕하세요'), { type: 'typing', role: 'patient' })

    useConversationStore.getState().clearTyping()

    expect(state().typingRole).toBeNull()
    expect(state().messages).toHaveLength(1)
  })

  it('reset은 상태·메시지·타이핑·오류를 모두 되돌린다', () => {
    useConversationStore.getState().setStatus({ state: 'open' })
    useConversationStore.getState().setError('socket-closed')
    dispatch(message('m1', 'staff', '안녕하세요'), { type: 'typing', role: 'patient' })

    useConversationStore.getState().reset()

    expect(state()).toMatchObject({
      status: { state: 'idle' },
      messages: [],
      typingRole: null,
      lastError: null,
    })
  })
})
