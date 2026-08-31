import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Heading, Text } from '@thegame/ui'
import { ContactForm } from '../../../components/ContactForm'
import { getDict, isSiteLocale } from '../../../i18n/dictionaries'
import styles from './page.module.css'

interface ContactParams {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: ContactParams): Promise<Metadata> {
  const { locale } = await params
  if (!isSiteLocale(locale)) return {}
  const dict = getDict(locale)
  return { title: `${dict.contact.title} — TheGame` }
}

export default async function ContactPage({ params }: ContactParams) {
  const { locale } = await params
  if (!isSiteLocale(locale)) notFound()
  const dict = getDict(locale)

  return (
    <main className={styles.main}>
      <div className={styles.intro}>
        <Heading level={1}>{dict.contact.title}</Heading>
        <Text tone="muted">{dict.contact.subtitle}</Text>
      </div>
      <ContactForm contact={dict.contact} />
    </main>
  )
}
