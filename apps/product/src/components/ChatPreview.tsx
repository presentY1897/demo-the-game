import type { SiteDict } from '../i18n/dictionaries'
import styles from './ChatPreview.module.css'

export function ChatPreview({ chat }: { chat: SiteDict['caretalk']['chat'] }) {
  return (
    <div className={styles.panel}>
      <div className={styles.rowPatient}>
        <div className={styles.metaPatient}>
          <span className="mono">{chat.patientLabel}</span>
        </div>
        <div className={`${styles.bubble} ${styles.bubblePatient}`}>
          <p className={styles.text}>{chat.patientText}</p>
          <p className={styles.translationPatient}>{chat.patientTranslation}</p>
        </div>
      </div>
      <div className={styles.rowStaff}>
        <div className={styles.metaStaff}>
          <span className="mono">{chat.staffLabel}</span>
        </div>
        <div className={`${styles.bubble} ${styles.bubbleStaff}`}>
          <p className={styles.text}>{chat.staffText}</p>
          <p className={styles.translationStaff}>{chat.staffTranslation}</p>
        </div>
      </div>
    </div>
  )
}
