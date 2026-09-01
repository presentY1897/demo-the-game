'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button, Card, Heading, Text, TextField } from '@thegame/ui'
import type { SiteDict } from '../i18n/dictionaries'
import styles from './ContactForm.module.css'

type ProductInterest = 'symposia' | 'caretalk'

interface FieldErrors {
  name?: string
  email?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ContactForm({ contact }: { contact: SiteDict['contact'] }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [org, setOrg] = useState('')
  const [message, setMessage] = useState('')
  const [interests, setInterests] = useState<ProductInterest[]>(['symposia'])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const successRef = useRef<HTMLOutputElement>(null)

  // 폼이 통째로 성공 카드로 바뀌면 포커스가 <body>로 떨어진다 — 키보드·스크린리더
  // 사용자는 아무 일도 일어나지 않은 것처럼 느낀다. 결과 영역으로 포커스를 옮긴다.
  useEffect(() => {
    if (status === 'success') successRef.current?.focus()
  }, [status])

  const toggleInterest = (value: ProductInterest) => {
    setInterests((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    )
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: FieldErrors = {}
    if (name.trim() === '') nextErrors.name = contact.errorName
    if (!EMAIL_PATTERN.test(email)) nextErrors.email = contact.errorEmail
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      // 첫 오류 필드로 포커스를 옮긴다 — aria-describedby가 걸려 있어 라벨과 오류가 함께 읽힌다
      const target = nextErrors.name !== undefined ? nameRef.current : emailRef.current
      target?.focus()
      return
    }

    setStatus('submitting')
    // 데모: 실제 전송 대신 접수 상태만 재현한다
    setTimeout(() => setStatus('success'), 900)
  }

  if (status === 'success') {
    return (
      <Card padding="lg" elevated>
        {/* <output>은 암묵적으로 role="status" — 폴라이트하게 읽히고, tabIndex로 포커스도 받는다 */}
        <output className={styles.success} tabIndex={-1} ref={successRef}>
          <Heading level={2}>{contact.successTitle}</Heading>
          <Text tone="muted">{contact.successBody}</Text>
        </output>
      </Card>
    )
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/*
        필드별 오류는 TextField가 role="alert"로 이미 읽는다. 여기는 "왜 안 보내졌는지"를
        폴라이트하게 한 번 더 알리는 요약이다 — <output>의 암묵 role="status"가 그 역할이다.
        assertive를 겹치면 오류 3개가 서로를 자른다.
      */}
      <output className={styles.formError}>{hasErrors ? contact.errorSummary : ''}</output>
      <TextField
        ref={nameRef}
        label={contact.name}
        value={name}
        onChange={(event) => setName(event.target.value)}
        {...(errors.name !== undefined ? { error: errors.name } : {})}
        autoComplete="name"
        required
      />
      <TextField
        ref={emailRef}
        label={contact.email}
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        {...(errors.email !== undefined ? { error: errors.email } : {})}
        autoComplete="email"
        required
      />
      <TextField
        label={contact.org}
        value={org}
        onChange={(event) => setOrg(event.target.value)}
        autoComplete="organization"
      />

      <fieldset className={styles.interests}>
        <legend className={styles.legend}>{contact.interest}</legend>
        <div className={styles.chips}>
          {(['symposia', 'caretalk'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={styles.chip}
              aria-pressed={interests.includes(value)}
              onClick={() => toggleInterest(value)}
            >
              {value === 'symposia' ? 'Symposia' : 'CareTalk'}
            </button>
          ))}
        </div>
      </fieldset>

      <label className={styles.messageField}>
        <span className={styles.legend}>{contact.message}</span>
        <textarea
          className={styles.textarea}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={contact.messagePlaceholder}
          rows={5}
        />
      </label>

      <Button type="submit" size="lg" loading={status === 'submitting'}>
        {contact.submit}
      </Button>
    </form>
  )
}
