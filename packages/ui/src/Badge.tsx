import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Badge.module.css'
import { cx } from './cx'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  /** 좌측 상태 점 — 연결 상태 같은 라이브 인디케이터에 사용 */
  dot?: boolean
  children: ReactNode
}

export function Badge({ tone = 'neutral', dot = false, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone], className)} {...rest}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  )
}
