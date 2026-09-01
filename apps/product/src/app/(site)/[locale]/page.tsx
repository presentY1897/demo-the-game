import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ButtonLink, Card, Heading, Text } from '@thegame/ui'
import { CaptionStage } from '../../../components/CaptionStage'
import { ChatPreview } from '../../../components/ChatPreview'
import { getDict, isSiteLocale } from '../../../i18n/dictionaries'
import { pageMetadata } from '../../../site'
import styles from './page.module.css'

const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL ?? 'http://localhost:8081'

interface LandingParams {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: LandingParams): Promise<Metadata> {
  const { locale } = await params
  if (!isSiteLocale(locale)) return {}
  const dict = getDict(locale)
  return pageMetadata({
    locale,
    title: dict.meta.landingTitle,
    description: dict.meta.landingDescription,
  })
}

export default async function LandingPage({ params }: LandingParams) {
  const { locale } = await params
  if (!isSiteLocale(locale)) notFound()
  const dict = getDict(locale)

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <p className={`mono ${styles.eyebrow}`}>{dict.hero.eyebrow}</p>
        <h1 className={styles.heroTitle}>{dict.hero.title}</h1>
        <p className={styles.heroSubtitle}>{dict.hero.subtitle}</p>
        <div className={styles.heroActions}>
          <ButtonLink href={DEMO_URL} size="lg" target="_blank" rel="noreferrer">
            {dict.hero.primaryCta}
          </ButtonLink>
          <ButtonLink href={`/${locale}/contact`} variant="secondary" size="lg">
            {dict.hero.secondaryCta}
          </ButtonLink>
        </div>
        <CaptionStage labels={dict.hero} />
      </section>

      <section id="symposia" className={styles.section}>
        <p className={`mono ${styles.eyebrow}`}>{dict.symposia.eyebrow}</p>
        <Heading level={2}>{dict.symposia.title}</Heading>
        <div className={styles.featureGrid}>
          {dict.symposia.features.map((feature) => (
            <Card key={feature.title} padding="lg">
              <div className={styles.feature}>
                <Heading level={4}>{feature.title}</Heading>
                <Text tone="muted" size="sm">
                  {feature.body}
                </Text>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section id="caretalk" className={styles.section}>
        <div className={styles.split}>
          <div className={styles.splitCopy}>
            <p className={`mono ${styles.eyebrow}`}>{dict.caretalk.eyebrow}</p>
            <Heading level={2}>{dict.caretalk.title}</Heading>
            <Text tone="muted">{dict.caretalk.body}</Text>
            <ul className={styles.checkList}>
              {dict.caretalk.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
          <ChatPreview chat={dict.caretalk.chat} />
        </div>
      </section>

      <section className={styles.section}>
        <p className={`mono ${styles.eyebrow}`}>{dict.how.eyebrow}</p>
        <Heading level={2}>{dict.how.title}</Heading>
        <ol className={styles.steps}>
          {dict.how.steps.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={`mono ${styles.stepIndex}`}>{String(index + 1).padStart(2, '0')}</span>
              <div className={styles.feature}>
                <Heading level={4}>{step.title}</Heading>
                <Text tone="muted" size="sm">
                  {step.body}
                </Text>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="about" className={styles.about}>
        <p className={`mono ${styles.eyebrow}`}>{dict.about.eyebrow}</p>
        <Heading level={2}>{dict.about.title}</Heading>
        <Text tone="muted">{dict.about.mission}</Text>
        <div className={styles.aboutLinks}>
          <Link className={styles.aboutLink} href={`/${locale}#symposia`}>
            {dict.about.symposiaLink}
          </Link>
          <Link className={styles.aboutLink} href={`/${locale}#caretalk`}>
            {dict.about.caretalkLink}
          </Link>
        </div>
      </section>

      <section className={styles.ctaBand}>
        <Heading level={2}>{dict.cta.title}</Heading>
        <Text tone="muted">{dict.cta.body}</Text>
        <ButtonLink href={`/${locale}/contact`} size="lg">
          {dict.cta.button}
        </ButtonLink>
      </section>
    </main>
  )
}
