import type { ReactNode } from 'react'
import styles from './Text.module.css'
import { cx } from './cx'

export type HeadingLevel = 1 | 2 | 3 | 4

export interface HeadingProps {
  level?: HeadingLevel
  id?: string
  className?: string
  children: ReactNode
}

export function Heading({ level = 2, id, className, children }: HeadingProps) {
  const Tag = `h${level}` as `h${HeadingLevel}`
  return (
    <Tag id={id} className={cx(styles.heading, styles[`h${level}`], className)}>
      {children}
    </Tag>
  )
}

export type TextSize = 'xs' | 'sm' | 'md' | 'lg'
export type TextTone = 'default' | 'muted' | 'danger'

export interface TextProps {
  size?: TextSize
  tone?: TextTone
  as?: 'p' | 'span' | 'div'
  className?: string
  children: ReactNode
}

export function Text({ size = 'md', tone = 'default', as: Tag = 'p', className, children }: TextProps) {
  return <Tag className={cx(styles.text, styles[`size-${size}`], styles[`tone-${tone}`], className)}>{children}</Tag>
}
