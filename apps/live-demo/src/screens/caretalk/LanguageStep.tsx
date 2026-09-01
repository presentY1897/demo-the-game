import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import type { ParticipantRole } from '@thegame/realtime'
import { ActionButton } from '../../components/ActionButton'
import { useLanguageOptions } from '../../hooks/useLanguageOptions'
import { languageLabel, useT } from '../../i18n'
import { createThemedStyles, font, radius, space, useTheme, useThemedStyles } from '../../theme'

interface LanguageStepProps {
  role: ParticipantRole
  selected: string
  onSelect: (lang: string) => void
  onContinue: () => void
}

/**
 * CareTalk 온보딩의 **유일한 단계**. 역할은 진입 버튼에서 이미 정해졌으므로
 * 언어만 고르면 끝난다(S02). 목록은 기관 설정을 따른다.
 */
export function LanguageStep({ role, selected, onSelect, onContinue }: LanguageStepProps) {
  const t = useT()
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)
  const { options, loading } = useLanguageOptions(role)

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header" aria-level={2}>
        {t('onboarding.languageTitle')}
      </Text>
      <Text style={styles.hint}>
        {role === 'patient' ? t('onboarding.patientLanguageHint') : t('onboarding.staffLanguageHint')}
      </Text>

      {/* 설정을 읽는 동안 폴백 목록을 먼저 보여주면 손가락 밑에서 목록이 바뀐다 —
          기다렸다가 한 번만 그린다 */}
      {loading && <ActivityIndicator color={color.primary} />}

      <ScrollView
        contentContainerStyle={styles.options}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('onboarding.languageTitle')}
      >
        {!loading && options.map((code) => {
          const active = code === selected
          return (
            <Pressable
              key={code}
              onPress={() => onSelect(code)}
              accessibilityRole="radio"
              // radio는 aria-checked가 필수다. accessibilityState는 웹으로 넘어가지 않는다.
              aria-checked={active}
              style={[styles.option, active && styles.optionActive]}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {languageLabel(t, code)}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <ActionButton label={t('onboarding.continue')} onPress={onContinue} disabled={loading} />
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  wrap: { flex: 1, padding: space[5], gap: space[3] },
  title: { fontSize: font.lg, fontWeight: '700', color: color.text },
  hint: { fontSize: font.sm, color: color.textMuted },
  options: { gap: space[2], paddingVertical: space[2] },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    // 고를 수 있는 항목의 경계다 — 장식이 아니라 컨트롤 경계 (WCAG 1.4.11)
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  optionActive: { borderColor: color.primary, backgroundColor: color.primarySubtle },
  optionText: { fontSize: font.md, color: color.text },
  optionTextActive: { color: color.primary, fontWeight: '700' },
}))
