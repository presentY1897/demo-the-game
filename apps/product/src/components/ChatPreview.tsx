import type { SiteDict } from '../i18n/dictionaries'
import styles from './ChatPreview.module.css'

/**
 * 진료실 대화 미리보기. 말풍선 안의 언어는 로케일과 무관하게 고정이다 —
 * 환자는 영어로 말하고 의료진은 한국어로 답한다. 그래서 `lang`을 문장마다 박는다:
 * 없으면 스크린리더가 페이지 언어(ko)의 음성 엔진으로 영어 문장을 읽어
 * "마이 헤드 허츠"처럼 들린다 (WCAG 3.1.2 Language of Parts).
 */
export function ChatPreview({ chat }: { chat: SiteDict['caretalk']['chat'] }) {
  return (
    <div className={styles.panel}>
      <div className={styles.rowPatient}>
        <div className={styles.metaPatient}>
          <span className="mono">{chat.patientLabel}</span>
        </div>
        <div className={`${styles.bubble} ${styles.bubblePatient}`}>
          <p className={styles.text} lang="en">
            {chat.patientText}
          </p>
          <p className={styles.translationPatient} lang="ko">
            {chat.patientTranslation}
          </p>
        </div>
      </div>
      <div className={styles.rowStaff}>
        <div className={styles.metaStaff}>
          <span className="mono">{chat.staffLabel}</span>
        </div>
        <div className={`${styles.bubble} ${styles.bubbleStaff}`}>
          <p className={styles.text} lang="ko">
            {chat.staffText}
          </p>
          <p className={styles.translationStaff} lang="en">
            {chat.staffTranslation}
          </p>
        </div>
      </div>
    </div>
  )
}
