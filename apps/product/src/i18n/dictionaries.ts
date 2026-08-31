const en = {
  meta: {
    title: 'Symposia & CareTalk — TheGame',
    description:
      'Real-time translation for aesthetic medicine congresses and clinics with international patients. Live captions for every attendee, two-way interpretation for every consultation.',
  },
  nav: {
    symposia: 'Symposia',
    caretalk: 'CareTalk',
    contact: 'Contact',
    liveDemo: 'Open live demo',
  },
  hero: {
    eyebrow: 'KO → EN · JA · ZH — LIVE',
    title: 'Every talk, in every attendee’s language.',
    subtitle:
      'Symposia turns live lectures into translated captions on each attendee’s phone. No headsets, no interpreter booth.',
    primaryCta: 'Open live demo',
    secondaryCta: 'Request a demo',
    stageSession: 'Hall A · Recent Advances in Laser Toning',
    stageLive: 'LIVE',
    stagePair: 'KO → EN',
  },
  symposia: {
    eyebrow: 'SYMPOSIA · FOR CONGRESSES',
    title: 'Built for the pace of a live lecture',
    features: [
      {
        title: 'Join with a QR code',
        body: 'Attendees scan a code and captions open in the browser. Nothing to install, nothing to hand out at the door.',
      },
      {
        title: 'Captions that resolve as they speak',
        body: 'Words appear while the speaker talks, then settle into a confirmed sentence with its translation beside it.',
      },
      {
        title: 'Drop-offs recover themselves',
        body: 'If a connection blips, the stream resumes exactly where it left off — missed sentences included.',
      },
    ],
  },
  caretalk: {
    eyebrow: 'CARETALK · FOR CLINICS',
    title: 'A consultation both sides understand',
    body: 'CareTalk sits between your staff and international patients. Each side speaks their own language and reads the other’s in theirs — with the original always kept next to the translation.',
    features: [
      'Two-way interpretation in the consult room',
      'Runs in the browser or inside your clinic app',
      'Original and translation stay side by side',
    ],
    chat: {
      patientText: 'My head hurts.',
      patientTranslation: '머리가 아파요.',
      staffText: '언제부터 증상이 시작되었나요?',
      staffTranslation: 'When did the symptoms start?',
      patientLabel: 'Patient · EN',
      staffLabel: 'Staff · KO',
    },
  },
  how: {
    eyebrow: 'HOW IT WORKS',
    title: 'From podium to phone in about a second',
    steps: [
      {
        title: 'Capture',
        body: 'The speaker’s microphone feeds our speech recognition as they talk.',
      },
      {
        title: 'Translate',
        body: 'Each sentence is translated the moment it is confirmed.',
      },
      {
        title: 'Deliver',
        body: 'Captions stream to every attendee’s device in the language they chose.',
      },
    ],
  },
  cta: {
    title: 'See it at your next congress',
    body: 'We run a live pilot at your venue — one session is enough to feel the difference.',
    button: 'Request a demo',
  },
  contact: {
    title: 'Request a demo',
    subtitle: 'Tell us where you want to run it. We usually reply within one business day.',
    name: 'Name',
    email: 'Work email',
    org: 'Organization',
    interest: 'I’m interested in',
    message: 'What are you planning?',
    messagePlaceholder: 'e.g. A two-day congress in June — sessions in Korean, attendees mostly EN/JA.',
    submit: 'Send request',
    successTitle: 'Request sent',
    successBody: 'Thanks — we’ll get back to you within one business day.',
    errorName: 'Please enter your name.',
    errorEmail: 'Please enter a valid email address.',
  },
  footer: {
    address: 'W-908, 7 Yeonmujang 5ga-gil, Seongdong-gu, Seoul',
    rights: '© 2026 TheGame. All rights reserved.',
  },
}

export type SiteDict = typeof en

const ko: SiteDict = {
  meta: {
    title: 'Symposia & CareTalk — 더게임',
    description:
      '미용의료 학회와 외국인 환자 병원을 위한 실시간 번역. 모든 참석자에게 실시간 자막을, 모든 진료에 양방향 통역을 제공합니다.',
  },
  nav: {
    symposia: 'Symposia',
    caretalk: 'CareTalk',
    contact: '문의',
    liveDemo: '라이브 데모 열기',
  },
  hero: {
    eyebrow: 'KO → EN · JA · ZH — LIVE',
    title: '모든 강연을, 모든 참석자의 언어로.',
    subtitle:
      'Symposia는 강연을 실시간 번역 자막으로 바꿔 참석자의 휴대폰에 바로 전달합니다. 수신기도, 통역 부스도 필요 없습니다.',
    primaryCta: '라이브 데모 열기',
    secondaryCta: '도입 문의하기',
    stageSession: 'Hall A · 레이저 토닝의 최신 지견',
    stageLive: 'LIVE',
    stagePair: 'KO → EN',
  },
  symposia: {
    eyebrow: 'SYMPOSIA · 학회를 위한',
    title: '라이브 강연의 속도에 맞춰 설계했습니다',
    features: [
      {
        title: 'QR 코드로 바로 입장',
        body: '참석자는 코드를 스캔하면 브라우저에서 자막이 열립니다. 설치할 것도, 나눠줄 장비도 없습니다.',
      },
      {
        title: '말하는 동안 완성되는 자막',
        body: '발화 중에는 단어가 실시간으로 나타나고, 문장이 확정되면 번역이 나란히 붙습니다.',
      },
      {
        title: '끊겨도 스스로 복구',
        body: '연결이 잠시 끊겨도 놓친 문장까지 포함해 끊긴 지점부터 그대로 이어집니다.',
      },
    ],
  },
  caretalk: {
    eyebrow: 'CARETALK · 병원을 위한',
    title: '양쪽 모두 이해하는 진료',
    body: 'CareTalk은 의료진과 외국인 환자 사이에 놓입니다. 각자 자기 언어로 말하고 상대의 말을 자기 언어로 읽습니다 — 원문은 항상 번역 옆에 함께 남습니다.',
    features: [
      '진료실 안의 양방향 통역',
      '브라우저 또는 병원 앱 안에서 동작',
      '원문과 번역이 항상 나란히',
    ],
    chat: {
      patientText: 'My head hurts.',
      patientTranslation: '머리가 아파요.',
      staffText: '언제부터 증상이 시작되었나요?',
      staffTranslation: 'When did the symptoms start?',
      patientLabel: '환자 · EN',
      staffLabel: '의료진 · KO',
    },
  },
  how: {
    eyebrow: '작동 방식',
    title: '연단에서 휴대폰까지, 약 1초',
    steps: [
      {
        title: '음성 인식',
        body: '발표자 마이크의 음성이 말하는 즉시 인식됩니다.',
      },
      {
        title: '번역',
        body: '문장이 확정되는 순간 바로 번역됩니다.',
      },
      {
        title: '전달',
        body: '참석자가 선택한 언어로 각자의 기기에 자막이 스트리밍됩니다.',
      },
    ],
  },
  cta: {
    title: '다음 학회에서 직접 확인하세요',
    body: '행사장에서 라이브 파일럿을 진행합니다 — 세션 하나면 차이를 느끼기에 충분합니다.',
    button: '도입 문의하기',
  },
  contact: {
    title: '도입 문의',
    subtitle: '어디에서 사용하실지 알려주세요. 보통 1영업일 안에 회신드립니다.',
    name: '이름',
    email: '업무용 이메일',
    org: '소속',
    interest: '관심 제품',
    message: '어떤 행사를 준비 중이신가요?',
    messagePlaceholder: '예) 6월 이틀 일정의 학회 — 발표는 한국어, 참석자는 대부분 EN/JA.',
    submit: '문의 보내기',
    successTitle: '문의가 접수되었습니다',
    successBody: '감사합니다 — 1영업일 안에 회신드리겠습니다.',
    errorName: '이름을 입력해 주세요.',
    errorEmail: '올바른 이메일 주소를 입력해 주세요.',
  },
  footer: {
    address: '서울 성동구 연무장5가길 7, W동 908호',
    rights: '© 2026 TheGame. All rights reserved.',
  },
}

export const siteLocales = ['en', 'ko'] as const
export type SiteLocale = (typeof siteLocales)[number]

export const isSiteLocale = (value: string): value is SiteLocale =>
  (siteLocales as readonly string[]).includes(value)

const dictionaries: Record<SiteLocale, SiteDict> = { en, ko }

export function getDict(locale: SiteLocale): SiteDict {
  return dictionaries[locale]
}
