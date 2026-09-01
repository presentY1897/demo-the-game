import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useT } from '../../i18n'
import { createThemedStyles, font, radius, space, useThemedStyles } from '../../theme'

/**
 * 회사 소개·데모 안내를 담는 시트. 첫 화면은 "무엇을 하러 왔는가"만 묻고,
 * 설명은 필요할 때 열어보게 옮겼다(S02).
 */
export function InfoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT()
  const styles = useThemedStyles(stylesFor)

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('info.title')}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}>
              <Text style={styles.close}>{t('common.close')}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.brand}>{t('company.name')}</Text>
            <Text style={styles.paragraph}>{t('company.mission')}</Text>

            <Text style={styles.sectionTitle}>{t('product.symposia.name')}</Text>
            <Text style={styles.paragraph}>{t('product.symposia.tagline')}</Text>

            <Text style={styles.sectionTitle}>{t('product.careTalk.name')}</Text>
            <Text style={styles.paragraph}>{t('product.careTalk.tagline')}</Text>

            <Text style={styles.sectionTitle}>{t('info.stackTitle')}</Text>
            <Text style={styles.paragraph}>{t('info.stackBody')}</Text>
            <Text style={styles.paragraph}>{t('info.demoBody')}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const stylesFor = createThemedStyles((color) => ({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  sheet: {
    maxHeight: '85%',
    backgroundColor: color.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space[5],
    paddingTop: space[4],
    paddingBottom: space[6],
    gap: space[3],
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: font.lg, fontWeight: '700', color: color.text },
  close: { fontSize: font.sm, fontWeight: '600', color: color.primary },
  body: { gap: space[2], paddingBottom: space[4] },
  brand: { fontSize: font.xl, fontWeight: '800', color: color.primary },
  sectionTitle: { fontSize: font.md, fontWeight: '700', color: color.text, marginTop: space[3] },
  paragraph: { fontSize: font.sm, color: color.textMuted, lineHeight: font.sm * 1.6 },
}))
