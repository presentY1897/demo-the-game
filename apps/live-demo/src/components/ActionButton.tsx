import { Pressable, Text, View } from 'react-native'
import { createThemedStyles, font, radius, space, useThemedStyles } from '../theme'

/** 최소 터치 타깃 44pt — 진료실에서 급하게 누르는 버튼이라 넉넉히 잡는다 (F02/S06) */
const MIN_TOUCH_SIZE = 44

interface ActionButtonProps {
  label: string
  /** 버튼 아래 한 줄 설명 — 누가 쓰는 버튼인지 */
  hint?: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  accessibilityLabel?: string
}

export function ActionButton({
  label,
  hint,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
}: ActionButtonProps) {
  const styles = useThemedStyles(stylesFor)
  const primary = variant === 'primary'

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...(accessibilityLabel === undefined ? {} : { accessibilityLabel })}
      style={[
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        disabled && styles.buttonDisabled,
      ]}
    >
      <View>
        <Text style={[styles.label, primary ? styles.labelPrimary : styles.labelSecondary]}>
          {label}
        </Text>
        {hint !== undefined && (
          <Text style={[styles.hint, primary && styles.hintPrimary]}>{hint}</Text>
        )}
      </View>
    </Pressable>
  )
}

const stylesFor = createThemedStyles((color) => ({
  button: {
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.md,
  },
  buttonPrimary: { backgroundColor: color.primary },
  buttonSecondary: { backgroundColor: color.surfaceSubtle, borderWidth: 1, borderColor: color.border },
  buttonDisabled: { opacity: 0.5 },
  label: { fontSize: font.md, fontWeight: '700' },
  labelPrimary: { color: color.onPrimary },
  labelSecondary: { color: color.text },
  hint: { fontSize: font.xs, color: color.textMuted, marginTop: 2 },
  hintPrimary: { color: `${color.onPrimary}C0` },
}))
