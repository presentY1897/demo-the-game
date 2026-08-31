'use client'

import { useEffect, useState } from 'react'
import { palette } from '@thegame/tokens'
import type { SiteDict } from '../i18n/dictionaries'
import styles from './CaptionStage.module.css'

const SENTENCES = [
  {
    ko: '기미 치료에서 저출력 레이저의 역할은 지난 십 년간 크게 확장되었습니다.',
    en: 'The role of low-fluence lasers in melasma treatment has expanded greatly over the past decade.',
  },
  {
    ko: '치료 간격은 2주가 표준이지만, 피부 반응에 따라 조정이 필요합니다.',
    en: 'A two-week interval is standard, but it should be adjusted based on skin response.',
  },
  {
    ko: '과도한 시술은 오히려 저색소증을 유발할 수 있다는 점을 강조하고 싶습니다.',
    en: 'I want to emphasize that overtreatment can actually cause hypopigmentation.',
  },
]

const TYPE_INTERVAL_MS = 55
const RESOLVE_DELAY_MS = 350
const HOLD_MS = 3200

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])
  return reduced
}

/** 제품의 핵심 순간(부분 자막 → 확정 → 번역)을 그대로 재생하는 히어로 스테이지 */
export function CaptionStage({ labels }: { labels: SiteDict['hero'] }) {
  const [index, setIndex] = useState(0)
  const [chars, setChars] = useState(0)
  const [resolved, setResolved] = useState(false)
  const reduced = usePrefersReducedMotion()

  const sentence = SENTENCES[index % SENTENCES.length] ?? SENTENCES[0]

  useEffect(() => {
    if (reduced || !sentence) return
    if (!resolved && chars < sentence.ko.length) {
      const timer = setTimeout(() => setChars((count) => count + 1), TYPE_INTERVAL_MS)
      return () => clearTimeout(timer)
    }
    if (!resolved) {
      const timer = setTimeout(() => setResolved(true), RESOLVE_DELAY_MS)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => {
      setResolved(false)
      setChars(0)
      setIndex((current) => (current + 1) % SENTENCES.length)
    }, HOLD_MS)
    return () => clearTimeout(timer)
  }, [chars, resolved, reduced, sentence])

  if (!sentence) return null
  const showFull = reduced || resolved
  const koText = showFull ? sentence.ko : sentence.ko.slice(0, chars)

  return (
    <div
      className={styles.stage}
      style={{ backgroundColor: palette.teal[900] }}
      role="img"
      aria-label={`${sentence.ko} — ${sentence.en}`}
    >
      <div className={styles.stageHeader}>
        <span className={`mono ${styles.session}`} style={{ color: palette.teal[300] }}>
          {labels.stageSession}
        </span>
        <span className={`mono ${styles.live}`} style={{ color: palette.coral[400] }}>
          <span className={styles.liveDot} style={{ backgroundColor: palette.coral[500] }} />
          {labels.stageLive}
        </span>
      </div>
      <p className={styles.source} style={{ color: palette.teal[50] }} aria-hidden="true">
        {koText}
        {!showFull && (
          <span className={styles.cursor} style={{ color: palette.coral[400] }}>
            ▌
          </span>
        )}
      </p>
      <div className={styles.translationSlot} aria-hidden="true">
        {showFull && (
          <>
            <span className={`mono ${styles.pair}`} style={{ color: palette.teal[400] }}>
              {labels.stagePair}
            </span>
            <p className={styles.translation} style={{ color: palette.teal[200] }}>
              {sentence.en}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
