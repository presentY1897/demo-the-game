import type { AnchorHTMLAttributes, ReactNode } from 'react'
import type { ButtonSize, ButtonVariant } from './Button'
import styles from './Button.module.css'
import { cx } from './cx'

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

/** 내비게이션 목적의 버튼 — Button과 같은 시각 언어를 <a>로 렌더링한다 */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <a className={cx(styles.button, styles[variant], styles[size], className)} {...rest}>
      {children}
    </a>
  )
}
