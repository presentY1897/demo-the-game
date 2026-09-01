import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useI18n, useT } from '../i18n'
import { useNav } from '../navigation'
import { createThemedStyles, font, space, useThemedStyles } from '../theme'

/** S06 기준 3: 최소 터치 타깃 */
const TOUCH_TARGET = 44

interface ScreenProps {
  title: string
  showBack?: boolean
  headerRight?: ReactNode
  children: ReactNode
}

export function Screen({ title, showBack = false, headerRight, children }: ScreenProps) {
  const t = useT()
  const back = useNav((state) => state.back)
  const { locale, toggle } = useI18n()
  const styles = useThemedStyles(stylesFor)

  return (
    <View style={styles.screen}>
      {/* 랜드마크 — 헤더는 banner, 본문은 main. 이게 없으면 스크린리더 사용자가
          화면마다 헤더 링크를 지나야 본문에 닿는다(axe: region / landmark-one-main). */}
      {/* `banner`/`main`은 RN의 accessibilityRole 유니온에 없다 — W3C 롤을 그대로 받는
          `role` prop을 쓴다(RN 0.71+ / RNW 모두 지원). */}
      <View style={styles.header} role="banner">
        <View style={styles.headerSide}>
          {showBack && (
            <Pressable
              onPress={back}
              hitSlop={12}
              accessibilityRole="button"
              // 화면에는 기호(‹)뿐이라 이름을 직접 준다 (S06 기준 2)
              accessibilityLabel={t('common.back')}
              style={styles.back}
            >
              <Text style={styles.backChevron} aria-hidden>
                ‹
              </Text>
            </Pressable>
          )}
          {/* 화면 제목이 이 페이지의 h1이다 — 확대해도 잘리지 않게 줄바꿈을 허용한다.
              `aria-level`을 붙여야 RNW가 h1으로 그리고, 접근성 트리에서도 레벨 1로 잡힌다
              (role="heading"만 있고 레벨이 없으면 보조기술은 레벨을 알 수 없다). */}
          <Text style={styles.title} accessibilityRole="header" aria-level={1}>
            {title}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {headerRight}
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={t('common.switchLanguage')}
            style={styles.locale}
          >
            <Text style={styles.localeText}>{locale === 'ko' ? 'EN' : '한국어'}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.body} role="main">
        {children}
      </View>
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  screen: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
    gap: space[3],
  },
  headerSide: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  // 44×44 (S06 기준 3). hitSlop은 웹에서 무시되므로 상자 자체를 키운다.
  back: { minWidth: TOUCH_TARGET, minHeight: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  // lineHeight를 숫자로 고정하면 OS 글자 확대 시 글리프가 잘린다 (RN은 lineHeight를
  // fontScale로 키우지 않는다) — 플랫폼 기본 leading에 맡긴다 (S06 기준 4)
  backChevron: { fontSize: font['2xl'], color: color.primary },
  title: { fontSize: font.lg, fontWeight: '700', color: color.text, flexShrink: 1 },
  locale: {
    minWidth: TOUCH_TARGET,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[2],
  },
  localeText: { fontSize: font.xs, fontWeight: '600', color: color.textMuted },
  body: { flex: 1 },
}))
