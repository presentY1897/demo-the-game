import { describe, expect, it } from 'vitest'
import type { AdminSettings } from '@thegame/realtime'
import {
  FALLBACK_PATIENT_LANGS,
  I18N_LANGS,
  selectPatientLangs,
  selectStaffLangs,
  STAFF_LANG,
} from '../languageSelectors'

const settings = (over: Partial<AdminSettings> = {}): AdminSettings => ({
  patientLangs: ['en', 'ja'],
  supportedLangs: ['en', 'ja', 'zh', 'vi'],
  ...over,
})

describe('selectPatientLangs', () => {
  it('기관 설정(S14)의 patientLangs를 그대로 따른다', () => {
    expect(selectPatientLangs(settings())).toEqual(['en', 'ja'])
  })

  it('설정에 없던 언어가 켜지면 그것도 따른다 — 목록의 정본은 기관 설정이다', () => {
    expect(selectPatientLangs(settings({ patientLangs: ['mn'] }))).toEqual(['mn'])
  })

  it('설정을 못 읽으면 i18n 리소스 기준으로 떨어진다', () => {
    expect(selectPatientLangs(null)).toEqual(FALLBACK_PATIENT_LANGS)
    expect(selectPatientLangs(undefined)).toEqual(FALLBACK_PATIENT_LANGS)
  })

  it('빈 목록이 새어 들어와도 화면이 비지 않는다', () => {
    expect(selectPatientLangs(settings({ patientLangs: [] }))).toEqual(FALLBACK_PATIENT_LANGS)
  })

  it('폴백 목록은 i18n에 이름이 있는 언어에서 의료진 언어를 뺀 것이다', () => {
    expect(I18N_LANGS).toContain(STAFF_LANG)
    expect(FALLBACK_PATIENT_LANGS).not.toContain(STAFF_LANG)
    expect(FALLBACK_PATIENT_LANGS.length).toBe(I18N_LANGS.length - 1)
  })

  it('돌려준 배열을 고쳐도 설정 원본은 그대로다', () => {
    const source = settings()
    selectPatientLangs(source).push('zz')

    expect(source.patientLangs).toEqual(['en', 'ja'])
  })
})

describe('selectStaffLangs', () => {
  it('한국어가 언제나 첫 번째고, 기관이 켤 수 있는 언어가 뒤따른다', () => {
    expect(selectStaffLangs(settings())).toEqual(['ko', 'en', 'ja', 'zh', 'vi'])
  })

  it('한국어가 supportedLangs에 있어도 중복되지 않는다', () => {
    expect(selectStaffLangs(settings({ supportedLangs: ['ko', 'en'] }))).toEqual(['ko', 'en'])
  })

  it('설정을 못 읽어도 최소한 한국어는 고를 수 있다', () => {
    expect(selectStaffLangs(null)[0]).toBe(STAFF_LANG)
  })
})
