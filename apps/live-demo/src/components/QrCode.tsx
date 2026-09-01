import { useState } from 'react'
import { Text, View } from 'react-native'
import QRCodeSvg from 'react-native-qrcode-svg'
import { useT } from '../i18n'
import { createThemedStyles, font, radius, space, useTheme, useThemedStyles } from '../theme'

/**
 * QR은 로컬에서 생성한다 — 외부 QR 이미지 API를 쓰지 않는다(S03).
 * 초대 링크는 방 주소이므로 제3자 서버에 흘리지 않는 게 맞고, 오프라인 시연에서도
 * 코드가 떠야 한다.
 *
 * QR은 항상 밝은 배경 위 어두운 모듈이어야 스캔이 잘 되므로 다크 테마에서도
 * 흰 판을 깔고 그린다(테마 색을 그대로 쓰면 반전돼 인식률이 떨어진다).
 */
const QR_BACKGROUND = '#FFFFFF'
const QR_FOREGROUND = '#000000'

export function QrCode({ value, size = 168 }: { value: string; size?: number }) {
  const t = useT()
  const { color } = useTheme()
  const styles = useThemedStyles(stylesFor)
  const [failed, setFailed] = useState(false)

  if (failed) {
    // 무음 실패 금지 — QR을 못 그리면 링크를 대신 읽을 수 있게 알린다
    return (
      <View style={[styles.fallback, { minWidth: size, minHeight: size }]}>
        <Text style={styles.fallbackText}>{t('common.error')}</Text>
      </View>
    )
  }

  return (
    // role=img — 안의 SVG 모듈은 낱개로 읽힐 것이 아니라 "QR 하나"다.
    // (`accessible`만 주면 웹에서 role 없는 div에 aria-label이 붙어 무효 마크업이 된다)
    <View style={styles.frame} accessible accessibilityRole="image" accessibilityLabel={t('room.qrHint')}>
      <QRCodeSvg
        value={value}
        size={size}
        color={QR_FOREGROUND}
        backgroundColor={QR_BACKGROUND}
        ecl="M"
        onError={() => setFailed(true)}
      />
      <View style={[styles.frameEdge, { borderColor: color.border }]} />
    </View>
  )
}

const stylesFor = createThemedStyles((color) => ({
  frame: {
    padding: space[3],
    backgroundColor: QR_BACKGROUND,
    borderRadius: radius.md,
    alignSelf: 'center',
  },
  frameEdge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  fallback: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[3],
    borderRadius: radius.md,
    backgroundColor: color.surfaceSubtle,
  },
  fallbackText: { color: color.danger, fontSize: font.sm },
}))
