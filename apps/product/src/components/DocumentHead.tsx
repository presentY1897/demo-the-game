import { themeCss } from '@thegame/tokens'

/**
 * 두 루트 레이아웃(`(entry)`, `(site)`)과 전역 not-found가 공유하는 `<head>` 내용.
 * 루트 레이아웃이 둘인 이유는 `<html lang>`을 로케일별로 정적 HTML에 박기 위해서다.
 *
 * 한글 본문은 **웹폰트를 쓰지 않는다**. jsDelivr의 Pretendard 동적 서브셋은 한국어
 * 랜딩에서 woff2 15개·390KB를 끌어오고 스왑 시점에 LCP를 다시 뒤로 밀었다
 * (`docs/perf/002-product-lighthouse.md` 참고). 디자인 토큰의 `--tg-font-sans`가
 * 이미 Pretendard → Apple SD Gothic Neo → Noto Sans KR 순서의 폴백을 선언하고 있어,
 * 로컬에 Pretendard가 있으면 그대로 쓰이고 없으면 OS 한글 UI 폰트로 렌더된다.
 * 모노 폰트만 `next/font`로 자체 호스팅한다 (`src/fonts.ts`).
 */
export function DocumentHead() {
  return (
    // precedence를 주면 React가 <head>로 끌어올리고 중복 삽입도 막는다
    // — 전역 not-found처럼 <head>를 직접 못 그리는 문서에서도 토큰이 적용된다
    <style href="tg-theme" precedence="high" dangerouslySetInnerHTML={{ __html: themeCss() }} />
  )
}
