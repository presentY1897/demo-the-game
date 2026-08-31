import type { Resources } from './en'

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>
}

export type ResourceShape = DeepStringify<Resources>

export const ko = {
  common: {
    loading: '불러오는 중…',
    retry: '다시 시도',
    close: '닫기',
    error: '문제가 발생했습니다',
  },
  nav: {
    home: '홈',
    products: '제품',
    company: '회사 소개',
    careers: '채용',
    contact: '문의',
    liveDemo: '라이브 데모',
  },
  connection: {
    idle: '대기 중',
    connecting: '연결 중…',
    open: '실시간',
    reconnecting: '재연결 중… ({attempt}번째 시도)',
    closed: '연결 끊김',
  },
  caption: {
    language: '언어',
    fontSize: '글자 크기',
    autoScroll: '자동 스크롤',
    paused: '일시정지됨 — 새 자막이 대기 중입니다',
    resume: '계속 보기',
    sessionEnded: '세션이 종료되었습니다',
  },
  conversation: {
    inputPlaceholder: '메시지를 입력하세요…',
    send: '보내기',
    staff: '의료진',
    patient: '환자',
    typing: '{role}이(가) 입력 중…',
  },
  product: {
    symposia: {
      name: 'Symposia',
      tagline: '모든 강연을, 모든 참석자의 언어로 — 실시간으로.',
    },
    careTalk: {
      name: 'CareTalk',
      tagline: '의료진과 환자를 잇는 양방향 의료 통역.',
    },
  },
  company: {
    name: '더게임',
    mission: '글로벌 의료 커뮤니케이션에서 언어 장벽을 없앱니다.',
  },
} satisfies ResourceShape
