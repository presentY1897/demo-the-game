import type { SiteDict } from '../i18n/dictionaries'
import styles from './SiteFooter.module.css'

export function SiteFooter({ footer }: { footer: SiteDict['footer'] }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.brand}>TheGame</span>
        <span>{footer.address}</span>
        <span>{footer.rights}</span>
      </div>
    </footer>
  )
}
