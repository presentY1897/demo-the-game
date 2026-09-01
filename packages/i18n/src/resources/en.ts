export const en = {
  common: {
    loading: 'Loading…',
    retry: 'Retry',
    close: 'Close',
    error: 'Something went wrong',
    comingSoon: 'Coming soon',
  },
  nav: {
    home: 'Home',
    products: 'Products',
    company: 'Company',
    careers: 'Careers',
    contact: 'Contact',
    liveDemo: 'Live demo',
  },
  connection: {
    idle: 'Ready',
    connecting: 'Connecting…',
    open: 'Live',
    reconnecting: 'Reconnecting… (attempt {attempt})',
    closed: 'Disconnected',
  },
  /** 언어 표시 이름 — 온보딩 목록과 대화 헤더가 함께 쓴다 */
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
    language: 'Language',
    fontSize: 'Font size',
    autoScroll: 'Auto-scroll',
    paused: 'Paused — new captions are waiting',
    resume: 'Resume',
    sessionEnded: 'The session has ended',
    waiting: 'Waiting for captions…',
    stageMode: 'Stage mode',
    stageModeHint: 'For dark lecture halls — large captions, screen stays on',
  },
  conversation: {
    inputPlaceholder: 'Type your message…',
    send: 'Send',
    staff: 'Staff',
    patient: 'Patient',
    typing: '{role} is typing…',
    langPair: '{myRole} ({myLang}) ↔ {peerRole} ({peerLang})',
    langPairUnknown: '{myRole} ({myLang}) ↔ {peerRole}',
    leave: 'Leave the room',
  },
  /**
   * 퀵 리플라이 칩 영역의 **껍데기**만 여기 있다 (S05).
   * 문구와 그룹 라벨은 대화 언어를 따르므로 `quick-replies.ts` 카탈로그에 있다.
   */
  quickReply: {
    title: 'Quick replies',
    expand: 'Show quick replies',
    collapse: 'Hide quick replies',
    longPressHint: 'Tap to send · press and hold to edit first',
  },
  home: {
    joinSession: 'Join a session',
    sessionCodePlaceholder: 'Session code (e.g. keynote-01)',
    enter: 'Enter',
    sessionCodeEmpty: 'Enter a session code',
    sessionCodeUnknown: 'No session matches that code',
    liveSessions: 'Sessions',
    noSessions: 'No sessions are scheduled yet',
    viewers: '{count} watching',
    startConversation: 'Start a conversation',
    startConversationHint: 'For staff — creates an invite code',
    joinWithCode: 'Join with an invite code',
    joinWithCodeHint: 'For patients',
    info: 'About this demo',
    resumeSession: 'Back to the session “{target}”',
    resumeRoom: 'Back to room {target}',
    resumeDismiss: 'Dismiss',
  },
  session: {
    waiting: 'Not started',
    playing: 'LIVE',
    paused: 'Paused',
    ended: 'Ended',
  },
  onboarding: {
    roleTitle: 'Who is using this device?',
    languageTitle: 'Choose your language',
    patientLanguageHint: 'Everything the staff says is translated into this language.',
    staffLanguageHint: 'Korean by default — change it if you need to.',
    continue: 'Continue',
  },
  room: {
    creating: 'Creating a room…',
    createFailed: 'Could not create a room',
    waitingTitle: 'Waiting for the patient',
    waitingHint: 'Show this code or QR to the patient.',
    inviteCode: 'Invite code',
    qrHint: 'Scan to join',
    linkHint: 'Or open this link',
    openConversation: 'Open the conversation',
    codeTitle: 'Enter the invite code',
    codePlaceholder: '6-character code',
    join: 'Join',
    joining: 'Joining…',
    codeEmpty: 'Enter the invite code',
    notFound: 'Check the code and try again',
  },
  info: {
    title: 'About this demo',
    demoBody:
      'Captions and conversations here are replayed by a mock server — a rehearsed talk and a clinic dialogue. No real patient data is involved.',
    stackTitle: 'How it works',
    stackBody:
      'Conference captions stream over SSE, the clinic conversation over WebSocket. The same React Native code runs on the web and in Expo Go.',
  },
  console: {
    title: 'Session console',
    comingSoon: 'Session controls for organisers and speakers are being built.',
  },
  admin: {
    title: 'Admin',
    comingSoon: 'Room monitoring and language settings are being built.',
  },
  product: {
    symposia: {
      name: 'Symposia',
      tagline: 'Every talk, in every attendee’s language — live.',
    },
    careTalk: {
      name: 'CareTalk',
      tagline: 'Two-way medical interpretation between staff and patients.',
    },
  },
  company: {
    name: 'TheGame',
    mission: 'Removing language barriers from global medical communication.',
  },
} as const

export type Resources = typeof en
