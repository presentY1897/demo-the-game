/**
 * CareTalk 퀵 리플라이 문구 카탈로그 (S05).
 *
 * ─── 왜 여기에 있나 ─────────────────────────────────────────────────────────
 * 이 파일은 문구의 **단일 원천**이다. 두 소비자가 같은 표를 읽는다:
 *
 *   1. `apps/live-demo` — 역할·언어에 맞는 칩 목록을 그린다.
 *   2. `apps/mock-server/src/translate.ts` — 1단계 사전을 이 표에서 만든다.
 *
 * 칩에 찍힌 문구가 곧 사전의 열쇠이므로, 퀵 리플라이로 보낸 말은 어떤 방향
 * (ko↔en↔ja)에서도 `[demo]` 폴백으로 떨어지지 않는다. 표를 고치면 화면과 서버가
 * 함께 따라온다 — 두 곳에 같은 문장을 적어 두고 어긋나는 일이 구조적으로 없다.
 *
 * ─── UI 문자열과의 경계 ─────────────────────────────────────────────────────
 * `resources/{ko,en}.ts`는 **앱 UI 언어**(화면 전체가 따르는 ko/en) 사전이다.
 * 여기 문구는 **대화 언어**(환자가 고른 언어, `myLang`)를 따른다 — 앱이 한국어로
 * 떠 있어도 일본어 환자의 칩은 일본어여야 하므로 두 축은 별개다. 그래서 문구와
 * 그룹 라벨은 리소스 트리가 아니라 이 카탈로그가 언어별로 들고 있다.
 * 칩 영역의 껍데기(제목·접기 버튼·힌트)는 UI 문자열이라 `quickReply.*` 리소스에 있다.
 */

/** 문구를 갖춘 대화 언어. 그 밖의 언어는 칩을 보여주지 않는다(S05 범위 제외). */
export const QUICK_REPLY_LOCALES = ['ko', 'en', 'ja'] as const
export type QuickReplyLocale = (typeof QUICK_REPLY_LOCALES)[number]

/**
 * 역할. `@thegame/realtime`의 `ParticipantRole`과 같은 값이지만,
 * i18n이 실시간 패키지에 의존하지 않도록 구조적으로만 맞춘다.
 */
export type QuickReplyRole = 'patient' | 'staff'

/** 상황 그룹 — 환자는 응답/증상/요청, 의료진은 문진/안내/마무리 */
export const QUICK_REPLY_GROUPS = [
  'reply',
  'symptom',
  'request',
  'intake',
  'guide',
  'closing',
] as const
export type QuickReplyGroup = (typeof QUICK_REPLY_GROUPS)[number]

export interface QuickReplyPhrase {
  id: string
  role: QuickReplyRole
  group: QuickReplyGroup
  /** 언어별 정본 문장. 칩에 찍히는 글자이자 서버 사전의 열쇠 */
  text: Record<QuickReplyLocale, string>
  /**
   * 사전 매칭에만 쓰는 이형(異形). 칩에는 노출하지 않는다 —
   * 사용자가 직접 타이핑한 다른 표현도 같은 문장으로 알아듣게 한다.
   */
  aliases?: Partial<Record<QuickReplyLocale, readonly string[]>>
  /**
   * true면 칩 목록에서 빼고 사전에만 넣는다. 기존 `translate.ts` 사전에 있던
   * 문장 중 칩으로 올리기엔 특수한 것들을 번역 품질 회귀 없이 넘겨받는 자리.
   */
  dictionaryOnly?: true
}

/** 그룹 라벨 — 칩 목록의 구분자. 대화 언어를 따른다 */
const groupLabels: Record<QuickReplyGroup, Record<QuickReplyLocale, string>> = {
  reply: { ko: '인사·응답', en: 'Greetings & replies', ja: 'あいさつと返事' },
  symptom: { ko: '증상', en: 'Symptoms', ja: '症状' },
  request: { ko: '요청', en: 'Requests', ja: 'お願い' },
  intake: { ko: '문진', en: 'Intake', ja: '問診' },
  guide: { ko: '안내', en: 'Guidance', ja: '案内' },
  closing: { ko: '마무리', en: 'Wrap-up', ja: 'しめくくり' },
}

/** 역할별 그룹 표시 순서. 환자는 "인사 → 증상"이 3탭 안에 끝나도록 앞에 둔다 */
const groupOrder: Record<QuickReplyRole, readonly QuickReplyGroup[]> = {
  patient: ['reply', 'symptom', 'request'],
  staff: ['intake', 'guide', 'closing'],
}

/**
 * 환자 문구 — 아픈 상태로 낯선 병원에 온 사람이 타이핑 없이 쓸 수 있어야 한다(F02).
 * 의료진 봇의 문진 순서(접수 → 증상 → 시점 → 알레르기)에 답할 수 있도록 맞췄다.
 */
const patientPhrases: readonly QuickReplyPhrase[] = [
  {
    id: 'greeting',
    role: 'patient',
    group: 'reply',
    text: { ko: '안녕하세요.', en: 'Hello.', ja: 'こんにちは。' },
    aliases: { en: ['hi'] },
  },
  {
    id: 'yes',
    role: 'patient',
    group: 'reply',
    text: { ko: '네.', en: 'Yes.', ja: 'はい。' },
  },
  {
    id: 'no',
    role: 'patient',
    group: 'reply',
    text: { ko: '아니요.', en: 'No.', ja: 'いいえ。' },
  },
  {
    id: 'thanks',
    role: 'patient',
    group: 'reply',
    text: { ko: '감사합니다.', en: 'Thank you.', ja: 'ありがとうございます。' },
  },
  {
    id: 'since-yesterday',
    role: 'patient',
    group: 'reply',
    text: { ko: '어제부터요.', en: 'Since yesterday.', ja: '昨日からです。' },
  },
  {
    id: 'fever',
    role: 'patient',
    group: 'symptom',
    text: { ko: '열이 나요.', en: 'I have a fever.', ja: '熱があります。' },
  },
  {
    id: 'pain-here',
    role: 'patient',
    group: 'symptom',
    text: { ko: '여기가 아파요.', en: 'It hurts here.', ja: 'ここが痛いです。' },
  },
  {
    id: 'headache',
    role: 'patient',
    group: 'symptom',
    text: { ko: '머리가 아파요.', en: 'My head hurts.', ja: '頭が痛いです。' },
    aliases: { en: ['i have a headache'], ko: ['두통이 있어요.'] },
  },
  {
    id: 'dizzy',
    role: 'patient',
    group: 'symptom',
    text: { ko: '어지러워요.', en: 'I feel dizzy.', ja: 'めまいがします。' },
  },
  {
    id: 'speak-slowly',
    role: 'patient',
    group: 'request',
    text: { ko: '천천히 말해 주세요.', en: 'Please speak slowly.', ja: 'ゆっくり話してください。' },
  },
  {
    id: 'say-again',
    role: 'patient',
    group: 'request',
    text: { ko: '다시 한 번 말해 주세요.', en: 'Could you say that again?', ja: 'もう一度言ってください。' },
  },
  {
    id: 'treatment-length',
    role: 'patient',
    group: 'request',
    text: {
      ko: '치료는 얼마나 걸리나요?',
      en: 'How long will the treatment take?',
      ja: '治療はどのくらいかかりますか。',
    },
  },
  // ─ 아래 둘은 칩이 아니라 사전 전용. 기존 translate.ts 사전에 있던 문장을
  //   그대로 넘겨받아, 자유 입력으로 들어와도 번역이 유지되게 한다.
  {
    id: 'no-allergies',
    role: 'patient',
    group: 'reply',
    dictionaryOnly: true,
    text: { ko: '알레르기는 없어요.', en: 'No allergies.', ja: 'アレルギーはありません。' },
  },
  {
    id: 'penicillin-allergy',
    role: 'patient',
    group: 'reply',
    dictionaryOnly: true,
    text: {
      ko: '페니실린 알레르기가 있어요.',
      en: "I'm allergic to penicillin.",
      ja: 'ペニシリンのアレルギーがあります。',
    },
  },
]

/**
 * 의료진 문구 — 진료실에서 반복되는 문진·안내·마무리.
 * 앞의 다섯 개(문진 4 + 마무리 1)는 `conversation.ts`의 봇 대행 스크립트와
 * **글자 그대로 같다**. 덕분에 봇이 일본어 환자에게 말할 때도 사전을 타서
 * `[demo]` 없이 번역된다 — 스크립트를 고치면 이 표도 같이 고쳐야 한다.
 */
const staffPhrases: readonly QuickReplyPhrase[] = [
  {
    id: 'intake-greeting',
    role: 'staff',
    group: 'intake',
    text: {
      ko: '안녕하세요, 어떤 증상으로 방문하셨나요?',
      en: 'Hello, what symptoms bring you in today?',
      ja: 'こんにちは。今日はどのような症状で来られましたか。',
    },
  },
  {
    id: 'when-started',
    role: 'staff',
    group: 'intake',
    text: {
      ko: '언제부터 증상이 시작되었나요?',
      en: 'When did the symptoms start?',
      ja: 'いつから症状が始まりましたか。',
    },
  },
  {
    id: 'describe-pain',
    role: 'staff',
    group: 'intake',
    text: {
      ko: '통증 부위를 조금 더 자세히 말씀해 주시겠어요?',
      en: 'Could you describe the painful area in more detail?',
      ja: '痛む場所をもう少し詳しく教えていただけますか。',
    },
  },
  {
    id: 'allergies-meds',
    role: 'staff',
    group: 'intake',
    text: {
      ko: '알레르기가 있거나 복용 중인 약이 있으신가요?',
      en: 'Do you have any allergies or medications you are taking?',
      ja: 'アレルギーや服用中のお薬はありますか。',
    },
  },
  {
    id: 'pain-level',
    role: 'staff',
    group: 'intake',
    text: {
      ko: '통증이 10점 만점에 몇 점인가요?',
      en: 'On a scale of 1 to 10, how bad is the pain?',
      ja: '痛みは10点満点で何点くらいですか。',
    },
  },
  {
    id: 'registration',
    role: 'staff',
    group: 'guide',
    text: {
      ko: '접수 도와드릴게요.',
      en: 'Let me help you with the registration.',
      ja: '受付をお手伝いします。',
    },
  },
  {
    id: 'wait-here',
    role: 'staff',
    group: 'guide',
    text: {
      ko: '여기서 잠시 기다려 주세요.',
      en: 'Please wait here for a moment.',
      ja: 'こちらで少々お待ちください。',
    },
  },
  {
    id: 'vitals',
    role: 'staff',
    group: 'guide',
    text: {
      ko: '체온과 혈압을 먼저 재겠습니다.',
      en: 'We will check your temperature and blood pressure first.',
      ja: '先に体温と血圧を測ります。',
    },
  },
  {
    id: 'documents',
    role: 'staff',
    group: 'guide',
    text: {
      ko: '여권이나 보험 서류를 보여 주시겠어요?',
      en: 'Could you show me your passport or insurance documents?',
      ja: 'パスポートか保険の書類を見せていただけますか。',
    },
  },
  {
    id: 'explain-plan',
    role: 'staff',
    group: 'closing',
    text: {
      ko: '네, 알겠습니다. 진찰 후에 치료 방향을 자세히 설명드릴게요.',
      en: 'I see. After the examination, I will explain the treatment plan in detail.',
      ja: 'はい、わかりました。診察の後に治療の方針を詳しくご説明します。',
    },
  },
  {
    id: 'prescription',
    role: 'staff',
    group: 'closing',
    text: {
      ko: '처방전을 드릴게요. 약국은 1층에 있습니다.',
      en: 'Here is your prescription. The pharmacy is on the first floor.',
      ja: '処方箋をお渡しします。薬局は1階にあります。',
    },
  },
  {
    id: 'take-care',
    role: 'staff',
    group: 'closing',
    text: {
      ko: '오늘 진료는 여기까지입니다. 몸조리 잘하세요.',
      en: "That's all for today. Please take care.",
      ja: '本日の診察は以上です。お大事にしてください。',
    },
  },
]

/** 전체 문구 표 — 화면과 서버 사전이 함께 읽는 단일 원천 */
export const quickReplyPhrases: readonly QuickReplyPhrase[] = [...patientPhrases, ...staffPhrases]

export function isQuickReplyLocale(lang: string): lang is QuickReplyLocale {
  return (QUICK_REPLY_LOCALES as readonly string[]).includes(lang)
}

export interface QuickReplyChip {
  id: string
  text: string
}

export interface QuickReplyGroupView {
  group: QuickReplyGroup
  label: string
  chips: QuickReplyChip[]
}

/**
 * 화면이 그릴 칩 묶음. 지원하지 않는 언어면 빈 배열을 돌려주고, 호출부는
 * 칩 영역을 통째로 감춘다 — 번역이 보장되지 않는 문구를 내보내지 않기 위해서다.
 */
export function quickRepliesFor(role: QuickReplyRole, lang: string): QuickReplyGroupView[] {
  if (!isQuickReplyLocale(lang)) return []
  const views: QuickReplyGroupView[] = []
  for (const group of groupOrder[role]) {
    const chips = quickReplyPhrases
      .filter(
        (phrase) =>
          phrase.role === role && phrase.group === group && phrase.dictionaryOnly !== true,
      )
      .map((phrase) => ({ id: phrase.id, text: phrase.text[lang] }))
    if (chips.length > 0) views.push({ group, label: groupLabels[group][lang], chips })
  }
  return views
}

export interface QuickReplyTranslationPair {
  from: QuickReplyLocale
  to: QuickReplyLocale
  /** 사전의 열쇠가 될 원문 (정본 문장 또는 이형) */
  source: string
  /** 그 문장의 대상 언어 정본 */
  target: string
}

/**
 * 서버 사전이 소비하는 형태. 카탈로그의 모든 문구를 지원 언어의
 * **모든 방향 조합**으로 펼친다 (ko↔en, ko↔ja, en↔ja).
 *
 * 정규화(소문자화·구두점 제거)는 매칭 쪽 관심사라 여기서 하지 않는다 —
 * 서버가 자기 규칙으로 정규화해 열쇠를 만든다.
 */
export function quickReplyTranslationPairs(): QuickReplyTranslationPair[] {
  const pairs: QuickReplyTranslationPair[] = []
  for (const phrase of quickReplyPhrases) {
    for (const from of QUICK_REPLY_LOCALES) {
      for (const to of QUICK_REPLY_LOCALES) {
        if (from === to) continue
        const target = phrase.text[to]
        pairs.push({ from, to, source: phrase.text[from], target })
        for (const alias of phrase.aliases?.[from] ?? []) {
          pairs.push({ from, to, source: alias, target })
        }
      }
    }
  }
  return pairs
}
