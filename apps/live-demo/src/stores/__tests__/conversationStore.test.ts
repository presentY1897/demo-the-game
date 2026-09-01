import { beforeEach, describe, expect, it } from 'vitest'
import type { ConversationEvent } from '@thegame/realtime'
import { selectPeerLang } from '../conversationSelectors'
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

const enterAsStaff = (): void =>
  useConversationStore
    .getState()
    .enterRoom({ roomId: 'room-1', inviteCode: 'K7QF2M', role: 'staff', lang: 'ko' })

describe('conversationStore', () => {
  beforeEach(() => {
    useConversationStore.getState().reset()
  })

  it('enterRoom은 방 신원을 세우고 이전 대화를 지운다', () => {
    dispatch(message('old', 'staff', '이전 방의 말'))

    enterAsStaff()

    expect(state()).toMatchObject({
      roomId: 'room-1',
      inviteCode: 'K7QF2M',
      myRole: 'staff',
      myLang: 'ko',
      messages: [],
      peerJoined: false,
    })
  })

  it('상대 역할의 joined는 입장 신호가 된다 (의료진 대기 화면 → 대화)', () => {
    enterAsStaff()

    dispatch({ type: 'joined', roomId: 'room-1', role: 'patient' })

    expect(state().peerJoined).toBe(true)
  })

  it('내 역할의 joined는 신호가 아니다 — 재연결로 다시 와도 마찬가지', () => {
    enterAsStaff()

    dispatch({ type: 'joined', roomId: 'room-1', role: 'staff' })

    expect(state().peerJoined).toBe(false)
  })

  it('한 번 선 입장 신호는 내려가지 않는다 (재연결로 대기 화면에 되돌아가지 않게)', () => {
    enterAsStaff()
    dispatch({ type: 'joined', roomId: 'room-1', role: 'patient' })

    dispatch({ type: 'joined', roomId: 'room-1', role: 'staff' })

    expect(state().peerJoined).toBe(true)
  })

  it('상대의 발화도 입장 증거다 — 새로고침으로 joined를 놓쳐도 따라잡는다', () => {
    enterAsStaff()

    dispatch(message('m1', 'patient', 'Hello'))

    expect(state().peerJoined).toBe(true)
  })

  it('상대의 typing도 입장 증거다', () => {
    enterAsStaff()

    dispatch({ type: 'typing', role: 'patient' })

    expect(state().peerJoined).toBe(true)
  })

  it('내 발화·타이핑은 입장 증거가 아니다', () => {
    enterAsStaff()

    dispatch(message('m1', 'staff', '안녕하세요'), { type: 'typing', role: 'staff' })

    expect(state().peerJoined).toBe(false)
  })

  it('message는 원문·번역을 언어와 함께 담아 순서대로 쌓는다', () => {
    dispatch(message('m1', 'staff', '어디가 불편하세요?'), message('m2', 'patient', 'My head'))

    expect(state().messages).toEqual([
      {
        id: 'm1',
        role: 'staff',
        lang: 'ko',
        text: '어디가 불편하세요?',
        translationLang: 'en',
        translationText: '어디가 불편하세요? (번역)',
        ts: 1_700_000_000_000,
      },
      {
        id: 'm2',
        role: 'patient',
        lang: 'en',
        text: 'My head',
        translationLang: 'ko',
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

  it('reset은 방 신원까지 전부 되돌린다 (나가기)', () => {
    enterAsStaff()
    useConversationStore.getState().setStatus({ state: 'open' })
    useConversationStore.getState().setError('socket-closed')
    dispatch(message('m1', 'staff', '안녕하세요'), { type: 'typing', role: 'patient' })

    useConversationStore.getState().reset()

    expect(state()).toMatchObject({
      roomId: null,
      inviteCode: null,
      myRole: null,
      myLang: null,
      peerJoined: false,
      status: { state: 'idle' },
      messages: [],
      typingRole: null,
      lastError: null,
    })
  })
})

describe('selectPeerLang', () => {
  it('발화가 없으면 상대 언어를 모른다', () => {
    expect(selectPeerLang([], 'staff')).toBeNull()
  })

  it('내 말이 번역돼 간 언어가 곧 상대 언어다', () => {
    useConversationStore.getState().reset()
    enterAsStaff()
    dispatch(message('m1', 'staff', '어디가 불편하세요?'))

    expect(selectPeerLang(state().messages, 'staff')).toBe('en')
  })

  it('상대가 한 말의 원문 언어를 우선 본다', () => {
    useConversationStore.getState().reset()
    enterAsStaff()
    dispatch(message('m1', 'staff', '안녕하세요'), message('m2', 'patient', 'Hello'))

    expect(selectPeerLang(state().messages, 'staff')).toBe('en')
    expect(selectPeerLang(state().messages, 'patient')).toBe('ko')
  })
})
