# 0010. RN 컴포넌트의 접근성 상태는 `accessibilityState`가 아니라 `aria-*` prop으로 준다

- **상태**: Accepted
- **날짜**: 2026-09-01
- **관련**: [S06 접근성 패스](../specs/S06-accessibility.md), [ADR 0002 live-demo = Expo RN](0002-live-demo-expo-react-native.md)

## 맥락 (Context)

S06 기준 2는 "상태 변화는 `accessibilityState`"라고 적고 있고, live-demo도 그대로
쓰고 있었다 — `accessibilityState={{ checked }}`, `{{ selected }}`, `{{ expanded }}`,
`{{ disabled }}`가 14곳.

그런데 웹 빌드를 axe-core로 재 보니 **`aria-required-attr` 위반이 23건** 나왔다.
`role="switch"`·`role="radio"`인데 `aria-checked`가 없다는 것이다. react-native-web
0.21.2의 `createDOMProps`를 열어 보면 이유가 분명하다: 이 버전이 DOM으로 옮기는 것은
`aria-checked` / `accessibilityChecked`(deprecated) 두 형태뿐이고, **`accessibilityState`는
목록에 아예 없다**. 즉 웹에서는 상태가 조용히 사라진다 — 코드는 상태를 준 것처럼 보이는데
보조기술에는 아무것도 가지 않는, 무음 실패다.

한편 RN 0.71부터 네이티브 쪽도 `aria-checked`/`aria-selected`/`aria-expanded`/
`aria-disabled`/`aria-hidden`을 정식 prop으로 받아 내부적으로 `accessibilityState`에
매핑한다. 이 앱은 같은 소스로 웹과 네이티브를 함께 그린다(ADR 0002).

`accessibilityRole`에도 같은 종류의 구멍이 있다. RN의 `AccessibilityRole` 유니온에는
`banner`·`main`·`group`처럼 랜드마크에 필요한 롤이 없다. 대신 RN 0.71+의 `role` prop이
W3C 롤을 그대로 받고, RNW도 `role || accessibilityRole` 순으로 읽는다.

## 결정 (Decision)

1. **상태는 `aria-*` prop으로 준다** — `aria-checked` / `aria-selected` /
   `aria-expanded` / `aria-disabled` / `aria-hidden`. `accessibilityState`는 쓰지 않는다.
2. **롤은 `accessibilityRole`을 기본으로 쓰되**, RN 유니온에 없는 W3C 롤
   (`banner`·`main`·`group` 등)은 `role` prop으로 준다.
3. 이 규칙이 지켜지는지는 **웹 빌드에 axe-core를 물려** 확인한다
   (`apps/live-demo/scripts/a11y-audit.mjs`). 사람이 눈으로 세지 않는다.

S06 명세 본문의 "`accessibilityState`"는 **의도(상태를 전달한다)를 가리킨 것**으로 읽고,
전달 수단은 이 ADR이 정본이다.

## 검토한 대안 (Alternatives)

| 대안 | 장점 | 단점 | 탈락 사유 |
|------|------|------|-----------|
| `accessibilityState`를 그대로 두고 웹만 별도 처리 | 명세 문구와 글자 그대로 일치 | 같은 정보를 두 벌로 쓰게 되고, 둘이 어긋나도 아무도 모른다 | 무음 실패를 구조로 굳힌다 |
| 둘 다 준다 (`accessibilityState` + `aria-*`) | 구버전 RNW에서도 안전 | RN은 `aria-*`가 우선이라 `accessibilityState`는 죽은 코드가 된다. 어느 쪽이 진짜인지 읽는 사람이 알 수 없다 | 중복이 정보가 아니라 잡음이다 |
| react-native-web을 올려 `accessibilityState` 지원을 기대 | 코드 무변경 | 0.21이 최신이고 RNW는 오히려 `aria-*`로 **수렴**하는 중이다(`accessibilityChecked`는 이미 deprecated 경고) | 방향이 반대다 |
| RN의 `AccessibilityRole`에 없는 롤을 포기 | 타입이 단순 | 랜드마크(`main`/`banner`) 없이는 axe의 `region`·`landmark-one-main`을 통과할 수 없고, 스크린리더 사용자가 본문으로 건너뛸 방법이 없다 | 기준 2를 만족할 수 없다 |

## 결과 (Consequences)

- **얻는 것**: 상태가 웹·네이티브 양쪽에서 실제로 전달된다. axe로 잰 live-demo
  접근성 위반이 138건(라이트)/132건(다크) → **0건**이 됐고, 그중 23건이 이 항목이었다.
  검사 수단이 자동이라 회귀도 잡힌다.
- **잃는 것**: 코드에 두 가지 표기(`accessibilityRole` + `role`, `aria-*`)가 섞인다.
  경계가 "RN 유니온에 있느냐"라는 라이브러리 사정이라 처음 보는 사람에게 자명하지 않다 —
  그래서 해당 지점마다 주석으로 이유를 남겼다.
- **잃는 것**: RN이 나중에 `accessibilityState`만 지원하는 방향으로 되돌아가면 다시
  바꿔야 한다. 가능성은 낮다고 봤다(RN·RNW 모두 `aria-*`로 가는 중).
- 새 화면을 만들 때 이 규칙을 모르면 예전 습관대로 `accessibilityState`를 쓰게 된다.
  현재 방어선은 axe 하네스뿐이고 **eslint 규칙은 없다** — 필요해지면 S10에서 추가한다.
