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
    comingSoon: '준비 중',
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
  language: {
    ko: '한국어',
    en: 'English',
    ja: '日本語',
    zh: '中文',
    vi: 'Tiếng Việt',
    ru: 'Русский',
    mn: 'Монгол',
  },
  caption: {
    language: '언어',
    fontSize: '글자 크기',
    autoScroll: '자동 스크롤',
    paused: '일시정지됨 — 새 자막이 대기 중입니다',
    resume: '계속 보기',
    sessionEnded: '세션이 종료되었습니다',
    waiting: '자막을 기다리는 중…',
    stageMode: '스테이지 모드',
    stageModeHint: '어두운 강연장용 — 큰 자막, 화면 꺼짐 방지',
  },
  conversation: {
    inputPlaceholder: '메시지를 입력하세요…',
    send: '보내기',
    staff: '의료진',
    patient: '환자',
    typing: '{role}이(가) 입력 중…',
    langPair: '{myRole}({myLang}) ↔ {peerRole}({peerLang})',
    langPairUnknown: '{myRole}({myLang}) ↔ {peerRole}',
    leave: '대화 나가기',
  },
  home: {
    joinSession: '세션 코드로 입장',
    sessionCodePlaceholder: '세션 코드 (예: keynote-01)',
    enter: '입장',
    sessionCodeEmpty: '세션 코드를 입력해 주세요',
    sessionCodeUnknown: '해당 코드의 세션이 없습니다',
    liveSessions: '세션',
    noSessions: '아직 등록된 세션이 없습니다',
    viewers: '{count}명 시청 중',
    startConversation: '새 대화 시작',
    startConversationHint: '의료진용 — 초대 코드가 발급됩니다',
    joinWithCode: '초대 코드로 입장',
    joinWithCodeHint: '환자용',
    info: '이 데모 정보',
    resumeSession: '이어서 “{target}” 세션으로 돌아가기',
    resumeRoom: '이어서 {target} 방으로 돌아가기',
    resumeDismiss: '지우기',
  },
  session: {
    waiting: '시작 전',
    playing: '진행 중',
    paused: '일시정지',
    ended: '종료됨',
  },
  onboarding: {
    roleTitle: '이 기기를 사용하는 사람은?',
    languageTitle: '사용할 언어를 선택하세요',
    patientLanguageHint: '의료진의 말이 이 언어로 번역됩니다.',
    staffLanguageHint: '기본은 한국어입니다. 필요하면 바꿀 수 있습니다.',
    continue: '계속',
  },
  room: {
    creating: '대화방을 만드는 중…',
    createFailed: '대화방을 만들지 못했습니다',
    waitingTitle: '환자 입장을 기다리는 중',
    waitingHint: '아래 코드나 QR을 환자에게 보여주세요.',
    inviteCode: '초대 코드',
    qrHint: 'QR을 찍어 입장',
    linkHint: '또는 이 링크로 입장',
    openConversation: '대화 화면으로',
    codeTitle: '초대 코드를 입력하세요',
    codePlaceholder: '6자리 코드',
    join: '입장',
    joining: '입장하는 중…',
    codeEmpty: '초대 코드를 입력해 주세요',
    notFound: '코드를 확인해 주세요',
  },
  info: {
    title: '이 데모 정보',
    demoBody:
      '이곳의 자막과 대화는 목 서버가 재생하는 시연용 데이터입니다 — 사전에 준비한 강연과 진료 대화이며, 실제 환자 정보는 쓰이지 않습니다.',
    stackTitle: '동작 방식',
    stackBody:
      '학회 자막은 SSE로, 진료 대화는 WebSocket으로 흐릅니다. 같은 React Native 코드가 웹과 Expo Go에서 함께 동작합니다.',
  },
  console: {
    title: '운영 콘솔',
    comingSoon: '간사·발표자용 세션 제어 화면을 준비하고 있습니다.',
  },
  admin: {
    title: '관리자',
    comingSoon: '상담방 현황과 지원 언어 설정 화면을 준비하고 있습니다.',
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
