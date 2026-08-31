import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'
import { cx } from './cx'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'md' | 'lg'
  elevated?: boolean
  children: ReactNode
}

export function Card({ padding = 'md', elevated = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx(styles.card, styles[`pad-${padding}`], elevated && styles.elevated, className)}
      {...rest}
    >
      {children}
    </div>
  )
}
