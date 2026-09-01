import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { createThemedStyles, font, radius, space, useTheme, useThemedStyles } from '../theme'

/**
 * "코드를 받아 적고 들어간다" 동선의 공용 입력.
 * 세션 코드(Symposia)와 초대 코드(CareTalk)가 같은 모양을 쓴다 —
 * 인라인 에러 자리를 컴포넌트가 갖고 있어 실패가 조용히 사라지지 않는다.
 */
interface CodeFieldProps {
  value: string
  onChangeText: (value: string) => void
  onSubmit: () => void
  placeholder: string
  submitLabel: string
  /** 인라인 에러 문구 — null이면 자리를 비운다 */
  error?: string | null
  busy?: boolean
  autoCapitalize?: 'none' | 'characters'
  accessibilityLabel?: string
}

export function CodeField({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  submitLabel,
  error = null,
  busy = false,
  autoCapitalize = 'none',
  accessibilityLabel,
}: CodeFieldProps) {
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, error !== null && styles.inputError]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={color.textMuted}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={!busy}
          {...(accessibilityLabel === undefined ? {} : { accessibilityLabel })}
        />
        <Pressable
          onPress={onSubmit}
          disabled={busy}
          accessibilityRole="button"
          // busy일 때 안에는 스피너뿐이라 라벨이 없으면 이름 없는 버튼이 된다
          accessibilityLabel={submitLabel}
          aria-disabled={busy}
          style={[styles.submit, busy && styles.submitBusy]}
        >
          {busy ? (
            <ActivityIndicator color={color.onPrimary} />
          ) : (
            <Text style={styles.submitText}>{submitLabel}</Text>
          )}
        </Pressable>
      </View>
      {error !== null && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  wrap: { gap: space[2] },
  row: { flexDirection: 'row', gap: space[2] },
  input: {
    flex: 1,
    // 글자를 키우면 <input>의 고유 폭이 커져 행이 화면 밖으로 밀린다 — 줄어들 수 있게 (1.4.10)
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: 10,
    fontSize: font.md,
    color: color.text,
    backgroundColor: color.surface,
  },
  inputError: { borderColor: color.danger },
  submit: {
    minHeight: 44,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    backgroundColor: color.primary,
  },
  submitBusy: { opacity: 0.7 },
  submitText: { color: color.onPrimary, fontWeight: '700', fontSize: font.sm },
  error: { color: color.danger, fontSize: font.sm },
}))
