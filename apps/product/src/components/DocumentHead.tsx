import { themeCss } from '@thegame/tokens'

/**
 * 두 루트 레이아웃(`(entry)`, `(site)`)이 공유하는 `<head>` 내용.
 * 루트 레이아웃이 둘인 이유는 `<html lang>`을 로케일별로 정적 HTML에 박기 위해서다.
 */
export function DocumentHead() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
      />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&display=swap"
      />
      {/* precedence를 주면 React가 <head>로 끌어올리고 중복 삽입도 막는다
          — 전역 not-found처럼 <head>를 직접 못 그리는 문서에서도 토큰이 적용된다 */}
      <style href="tg-theme" precedence="high" dangerouslySetInnerHTML={{ __html: themeCss() }} />
    </>
  )
}
