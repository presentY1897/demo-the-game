import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_LANG_FOR, useOnboarding } from '../onboardingStore'

const state = () => useOnboarding.getState()

describe('onboardingStore', () => {
  beforeEach(() => {
    useOnboarding.getState().reset()
  })

  it('아무것도 고르지 않은 상태로 시작한다', () => {
    expect(state()).toMatchObject({ role: null, lang: null, confirmed: false })
  })

  it('역할을 고르면 그 역할의 기본 언어가 놓인다 — 의료진 ko, 환자 en', () => {
    useOnboarding.getState().setRole('staff')
    expect(state()).toMatchObject({ role: 'staff', lang: DEFAULT_LANG_FOR.staff })

    useOnboarding.getState().setRole('patient')
    expect(state()).toMatchObject({ role: 'patient', lang: DEFAULT_LANG_FOR.patient })
  })

  it('기본값이 놓여도 확인 전까지는 온보딩이 끝나지 않는다', () => {
    useOnboarding.getState().setRole('patient')
    expect(state().confirmed).toBe(false)

    useOnboarding.getState().confirm()
    expect(state().confirmed).toBe(true)
  })

  it('언어를 바꾸면 역할은 그대로 남는다', () => {
    useOnboarding.getState().setRole('patient')

    useOnboarding.getState().setLang('ja')

    expect(state()).toMatchObject({ role: 'patient', lang: 'ja' })
  })

  it('역할을 바꾸면 언어와 확인 상태가 그 역할 기준으로 다시 시작한다', () => {
    useOnboarding.getState().setRole('patient')
    useOnboarding.getState().setLang('ja')
    useOnboarding.getState().confirm()

    useOnboarding.getState().setRole('staff')

    expect(state()).toMatchObject({ role: 'staff', lang: 'ko', confirmed: false })
  })

  it('restore는 저장된 선택을 그대로 살리고 온보딩을 건너뛴다', () => {
    useOnboarding.getState().restore('patient', 'vi')

    expect(state()).toMatchObject({ role: 'patient', lang: 'vi', confirmed: true })
  })

  it('reset은 역할·언어·확인 상태를 모두 비운다', () => {
    useOnboarding.getState().restore('staff', 'ko')

    useOnboarding.getState().reset()

    expect(state()).toMatchObject({ role: null, lang: null, confirmed: false })
  })
})
