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
      // react-native-web 0.21은 `accessibilityState`를 DOM으로 옮기지 않는다(측정으로 확인).
      // `aria-*`는 RN 네이티브·웹 양쪽이 읽으므로 상태는 이 형태로 준다 (S06 구현 메모).
      aria-disabled={disabled}
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
  // 경계가 곧 버튼의 윤곽이다 — 장식용 hairline이 아니라 컨트롤 경계라 borderStrong (WCAG 1.4.11)
  buttonSecondary: { backgroundColor: color.surfaceSubtle, borderWidth: 1, borderColor: color.borderStrong },
  buttonDisabled: { opacity: 0.5 },
  label: { fontSize: font.md, fontWeight: '700' },
  labelPrimary: { color: color.onPrimary },
  labelSecondary: { color: color.text },
  hint: { fontSize: font.xs, color: color.textMuted, marginTop: 2 },
  // 75%(C0)는 primary 위에서 4.48:1로 AA 미달이었다(axe 실측) → 85%로 올려 5.26(라이트)/5.39(다크)
  hintPrimary: { color: `${color.onPrimary}D9` },
}))
