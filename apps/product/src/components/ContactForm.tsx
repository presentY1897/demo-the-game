'use client'

import { useState, type FormEvent } from 'react'
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
    if (Object.keys(nextErrors).length > 0) return

    setStatus('submitting')
    // 데모: 실제 전송 대신 접수 상태만 재현한다
    setTimeout(() => setStatus('success'), 900)
  }

  if (status === 'success') {
    return (
      <Card padding="lg" elevated>
        <div className={styles.success}>
          <Heading level={3}>{contact.successTitle}</Heading>
          <Text tone="muted">{contact.successBody}</Text>
        </div>
      </Card>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextField
        label={contact.name}
        value={name}
        onChange={(event) => setName(event.target.value)}
        {...(errors.name !== undefined ? { error: errors.name } : {})}
        autoComplete="name"
      />
      <TextField
        label={contact.email}
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        {...(errors.email !== undefined ? { error: errors.email } : {})}
        autoComplete="email"
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
