import { describe, expect, it } from 'vitest'
import { createTranslator } from '@thegame/i18n'
import { consoleErrorMessage } from '../errors'

const t = createTranslator('ko')

describe('consoleErrorMessage', () => {
  it('서버 안정 코드를 운영자 문장으로 바꾼다', () => {
    expect(consoleErrorMessage(t, { code: 'invalid-transition', message: 'x' })).toBe(
      t('console.error.invalidTransition'),
    )
    expect(consoleErrorMessage(t, { code: 'invalid-rate', message: 'x' })).toBe(
      t('console.error.invalidRate'),
    )
    expect(consoleErrorMessage(t, { code: 'unsupported-language', message: 'x' })).toBe(
      t('console.error.unsupportedLanguage'),
    )
    expect(consoleErrorMessage(t, { code: 'not-found', message: 'x' })).toBe(
      t('console.error.notFound'),
    )
    expect(consoleErrorMessage(t, { code: 'network', message: 'x' })).toBe(
      t('console.error.network'),
    )
  })

  it('모르는 코드는 감추지 않고 그대로 붙여 보여준다', () => {
    const message = consoleErrorMessage(t, { code: 'invalid-body', message: 'x' })

    expect(message).toContain('invalid-body')
  })
})
