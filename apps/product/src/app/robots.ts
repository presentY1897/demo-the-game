import type { MetadataRoute } from 'next'
import { absoluteUrl } from '../site'

export const dynamic = 'force-static'

/**
 * `/`는 브라우저 언어를 보고 /ko·/en으로 보내는 스텁이지만 robots로 막지 않는다 —
 * 막으면 크롤러가 그 페이지의 canonical(`/en`)을 읽지 못한다. 색인 통합은 canonical에 맡긴다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
