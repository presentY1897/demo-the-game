import { useId, type InputHTMLAttributes, type Ref } from 'react'
import styles from './TextField.module.css'
import { cx } from './cx'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  /**
   * 소비하는 폼이 오류 발생 시 이 입력으로 포커스를 옮길 수 있어야 한다.
   * React 19에서는 함수 컴포넌트도 ref를 일반 prop으로 받는다.
   */
  ref?: Ref<HTMLInputElement>
}

export function TextField({ label, hint, error, id, className, ref, ...rest }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={cx(styles.input, error !== undefined && styles.invalid)}
        aria-invalid={error !== undefined || undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error !== undefined ? (
        <p id={`${inputId}-error`} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint !== undefined ? (
        <p id={`${inputId}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
