export type ScriptLang = 'ko' | 'en' | 'ja' | 'zh'

export interface ScriptSentence {
  id: string
  texts: Record<ScriptLang, string>
}

export interface SessionScript {
  id: string
  title: string
  speaker: string
  sourceLang: ScriptLang
  targetLangs: ScriptLang[]
  sentences: ScriptSentence[]
}

export const keynote: SessionScript = {
  id: 'keynote-01',
  title: 'Recent Advances in Laser Toning',
  speaker: 'Dr. Seoyeon Kim',
  sourceLang: 'ko',
  targetLangs: ['en', 'ja', 'zh'],
  sentences: [
    {
      id: 's01',
      texts: {
        ko: '안녕하세요. 오늘은 레이저 토닝의 최신 지견에 대해 말씀드리겠습니다.',
        en: 'Hello everyone. Today I will talk about recent advances in laser toning.',
        ja: 'こんにちは。本日はレーザートーニングの最新知見についてお話しします。',
        zh: '大家好。今天我将介绍激光嫩肤的最新进展。',
      },
    },
    {
      id: 's02',
      texts: {
        ko: '기미 치료에서 저출력 레이저의 역할은 지난 십 년간 크게 확장되었습니다.',
        en: 'The role of low-fluence lasers in melasma treatment has expanded greatly over the past decade.',
        ja: '肝斑治療における低出力レーザーの役割は、この十年で大きく広がりました。',
        zh: '在过去十年中，低能量激光在黄褐斑治疗中的作用大大扩展。',
      },
    },
    {
      id: 's03',
      texts: {
        ko: '먼저 색소 병변의 병태생리부터 간단히 짚고 넘어가겠습니다.',
        en: 'First, let me briefly review the pathophysiology of pigmented lesions.',
        ja: 'まず、色素性病変の病態生理を簡単に確認しましょう。',
        zh: '首先，让我们简要回顾色素性病变的病理生理。',
      },
    },
    {
      id: 's04',
      texts: {
        ko: '멜라닌 세포의 활성도는 자외선 노출과 호르몬 변화에 민감하게 반응합니다.',
        en: 'Melanocyte activity responds sensitively to UV exposure and hormonal changes.',
        ja: 'メラノサイトの活性は、紫外線曝露やホルモン変化に敏感に反応します。',
        zh: '黑色素细胞的活性对紫外线照射和激素变化反应敏感。',
      },
    },
    {
      id: 's05',
      texts: {
        ko: '저희 병원에서는 지난 2년간 300례 이상의 증례를 분석했습니다.',
        en: 'At our clinic, we analyzed more than 300 cases over the past two years.',
        ja: '当院では過去2年間で300例以上の症例を分析しました。',
        zh: '我们医院在过去两年中分析了300多例病例。',
      },
    },
    {
      id: 's06',
      texts: {
        ko: '치료 간격은 2주가 표준이지만, 피부 반응에 따라 조정이 필요합니다.',
        en: 'A two-week interval is standard, but it should be adjusted based on skin response.',
        ja: '治療間隔は2週間が標準ですが、皮膚反応に応じて調整が必要です。',
        zh: '治疗间隔以两周为标准，但需要根据皮肤反应进行调整。',
      },
    },
    {
      id: 's07',
      texts: {
        ko: '과도한 시술은 오히려 저색소증을 유발할 수 있다는 점을 강조하고 싶습니다.',
        en: 'I want to emphasize that overtreatment can actually cause hypopigmentation.',
        ja: '過度な施術はかえって低色素症を引き起こし得る点を強調したいと思います。',
        zh: '我想强调，过度治疗反而可能导致色素减退。',
      },
    },
    {
      id: 's08',
      texts: {
        ko: '다음 슬라이드에서 실제 증례 사진을 보시겠습니다.',
        en: 'In the next slide, we will look at photos of actual cases.',
        ja: '次のスライドで実際の症例写真をご覧いただきます。',
        zh: '下一张幻灯片中，我们将看到实际病例的照片。',
      },
    },
    {
      id: 's09',
      texts: {
        ko: '6회 시술 후 색소 침착이 유의미하게 감소한 것을 확인할 수 있습니다.',
        en: 'After six sessions, you can see a significant reduction in pigmentation.',
        ja: '6回の施術後、色素沈着が有意に減少したことが確認できます。',
        zh: '六次治疗后，可以确认色素沉着明显减少。',
      },
    },
    {
      id: 's10',
      texts: {
        ko: '질문은 세션이 끝난 뒤 패널 토의 시간에 받겠습니다. 감사합니다.',
        en: 'I will take questions during the panel discussion after this session. Thank you.',
        ja: 'ご質問はセッション終了後のパネルディスカッションでお受けします。ありがとうございました。',
        zh: '问题将在会议结束后的小组讨论时间接受。谢谢大家。',
      },
    },
  ],
}

export const sessions: SessionScript[] = [keynote]
