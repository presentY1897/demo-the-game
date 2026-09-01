import { describe, expect, it } from 'vitest'
import type { AdminSettings } from '@thegame/realtime'
import { sameLangs, saveErrorKey, toggleLanguage, toggleListLangs } from '../languageSettings'

const SUPPORTED = ['en', 'ja', 'zh', 'vi', 'ru', 'mn']

const settings = (over: Partial<AdminSettings> = {}): AdminSettings => ({
  patientLangs: ['en', 'ja', 'zh'],
  supportedLangs: SUPPORTED,
  ...over,
})

describe('toggleListLangs', () => {
  it('서버가 준 후보 순서를 그대로 쓴다', () => {
    expect(toggleListLangs(settings())).toEqual(SUPPORTED)
  })

  it('후보에서 빠졌는데 아직 켜져 있는 언어도 목록에 남긴다', () => {
    const shrunk = settings({ patientLangs: ['en', 'kl'], supportedLangs: ['en', 'ja'] })
    expect(toggleListLangs(shrunk)).toEqual(['en', 'ja', 'kl'])
  })
})

describe('toggleLanguage', () => {
  it('꺼진 언어를 켜고, 목록 순서를 유지한다', () => {
    const result = toggleLanguage(['en', 'zh'], SUPPORTED, 'ja')
    expect(result).toEqual({ ok: true, next: ['en', 'ja', 'zh'] })
  })

  it('켜진 언어를 끈다', () => {
    const result = toggleLanguage(['en', 'ja', 'zh'], SUPPORTED, 'ja')
    expect(result).toEqual({ ok: true, next: ['en', 'zh'] })
  })

  it('마지막 하나는 끄지 못한다 — 서버 400을 만나기 전에 막는다', () => {
    expect(toggleLanguage(['en'], SUPPORTED, 'en')).toEqual({ ok: false, reason: 'last-language' })
  })

  it('마지막 하나여도 다른 언어를 켜는 건 막지 않는다', () => {
    expect(toggleLanguage(['en'], SUPPORTED, 'vi')).toEqual({ ok: true, next: ['en', 'vi'] })
  })

  it('목록에 없는 코드는 뒤로 보낸다', () => {
    expect(toggleLanguage(['en'], SUPPORTED, 'kl')).toEqual({ ok: true, next: ['en', 'kl'] })
  })

  it('입력 배열을 건드리지 않는다', () => {
    const selected = ['en', 'ja']
    toggleLanguage(selected, SUPPORTED, 'zh')
    expect(selected).toEqual(['en', 'ja'])
  })
})

describe('sameLangs', () => {
  it('순서가 달라도 같은 집합이면 저장할 게 없다', () => {
    expect(sameLangs(['en', 'ja'], ['ja', 'en'])).toBe(true)
  })

  it('원소가 다르면 다르다', () => {
    expect(sameLangs(['en', 'ja'], ['en', 'zh'])).toBe(false)
    expect(sameLangs(['en'], ['en', 'zh'])).toBe(false)
  })
})

describe('saveErrorKey', () => {
  it('서버 코드를 사용자 말로 옮긴다 — 실패 이유를 삼키지 않는다', () => {
    expect(saveErrorKey('unsupported-language')).toBe('admin.langUnsupported')
    expect(saveErrorKey('invalid-body')).toBe('admin.langLastOne')
    expect(saveErrorKey('network')).toBe('admin.langOffline')
    expect(saveErrorKey('teapot')).toBe('admin.langSaveFailed')
  })
})
