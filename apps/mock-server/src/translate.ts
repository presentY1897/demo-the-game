const enToKo: Record<string, string> = {
  hello: '안녕하세요.',
  hi: '안녕하세요.',
  'my head hurts': '머리가 아파요.',
  'i have a headache': '두통이 있어요.',
  'since yesterday': '어제부터요.',
  'it hurts here': '여기가 아파요.',
  'i feel dizzy': '어지러워요.',
  "i'm allergic to penicillin": '페니실린 알레르기가 있어요.',
  'no allergies': '알레르기는 없어요.',
  'how long will the treatment take': '치료는 얼마나 걸리나요?',
  'thank you': '감사합니다.',
  yes: '네.',
  no: '아니요.',
}

const normalize = (text: string): string =>
  text.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim()

/**
 * 데모용 번역 엔진 — 자주 쓰는 진료 문구는 사전에서, 나머지는
 * 표시용 마커를 붙여 반환한다 (실제 번역 API 자리)
 */
export function mockTranslate(text: string, from: string, to: string): string {
  if (from === to) return text
  if (from === 'en' && to === 'ko') {
    const hit = enToKo[normalize(text)]
    if (hit !== undefined) return hit
  }
  return to === 'ko' ? `[데모 번역] ${text}` : `[demo] ${text}`
}
