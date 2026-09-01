# @thegame/product

Symposia(학회용 실시간 번역)와 CareTalk(병원용 대화 통역)을 소개하는 제품 홈페이지.
Next.js App Router + `output: 'export'`로 **정적 사이트**를 뽑는다 — 문의 폼도 클라이언트에서
처리하므로 서버 런타임이 필요 없고, 어떤 정적 호스팅에도 그대로 올라간다.

```bash
pnpm --filter @thegame/product dev     # http://localhost:3001
pnpm --filter @thegame/product build   # out/ 에 정적 산출물
pnpm --filter @thegame/product test    # build 후 산출물(HTML/sitemap/robots) 검사
pnpm --filter @thegame/product typecheck
```

빌드 결과를 그대로 확인하려면:

```bash
node apps/product/scripts/serve-static.mjs apps/product/out 3011
```

## 구조

| 경로 | 역할 |
|---|---|
| `src/app/(entry)/` | `/` — 브라우저 언어를 보고 `/ko`·`/en`으로 보내는 진입 스텁 |
| `src/app/(site)/[locale]/` | 랜딩(`/ko`, `/en`)과 문의(`/ko/contact`, `/en/contact`) |
| `src/app/sitemap.ts` · `robots.ts` | Next 컨벤션 메타데이터 라우트 → `out/sitemap.xml`, `out/robots.txt` |
| `src/app/not-found.tsx` | `out/404.html` (ko/en 병기) |
| `src/site.ts` | canonical·hreflang·OG 등 페이지 메타를 만드는 헬퍼 |
| `src/i18n/dictionaries.ts` | **모든 UI 문자열**(ko/en). 하드코딩 금지 |
| `src/fonts.ts` | `next/font`로 자체 호스팅하는 모노 폰트 |
| `src/components/` | `CaptionStage`(히어로 자막 연출), `ChatPreview`, `ContactForm` 등 |
| `scripts/` | OG 이미지·로고 생성, 산출물 정적 서빙 |

**루트 레이아웃이 두 개다.** `(entry)`와 `(site)`가 각자 `<html>`을 그린다 —
`<html lang>`을 로케일별로 **정적 HTML에 박기 위해서**다. 크롤러는 JS 실행 전에 이 값을
읽으므로 클라이언트에서 보정하면 늦다. 대신 전역 not-found는 레이아웃 없이 렌더되므로
`src/app/not-found.tsx`가 필요한 것을 직접 챙긴다.

## 환경변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3001` | canonical·hreflang·OG·sitemap의 절대 URL. **정적 export라 빌드 시점에 확정**되므로 배포 도메인이 정해지면 빌드 환경에 넣어야 한다 (S07) |
| `NEXT_PUBLIC_DEMO_URL` | `http://localhost:8081` | 헤더·히어로의 "라이브 데모 열기" 링크(`apps/live-demo`) |

## SEO

`curl`로 바로 확인할 수 있다 (위 정적 서버 기준).

```bash
curl -s localhost:3011/robots.txt
curl -s localhost:3011/sitemap.xml
curl -s localhost:3011/ko  | grep -o '<link rel="canonical"[^>]*>\|hrefLang="[^"]*" href="[^"]*"'
curl -s localhost:3011/ko  | grep -o '<meta property="og:[^>]*>'
curl -s localhost:3011/ko  | python3 -c 'import re,sys;print(re.search(r"ld\+json\">(.*?)</script>",sys.stdin.read(),re.S).group(1))'
```

같은 항목을 `src/__tests__/build-output.test.ts`가 빌드 산출물에 대해 자동 검사한다.

## 이미지

OG 이미지(`public/og.png`, 1200×630)와 로고(`public/logo.png`)는 커밋되어 있다.
원본은 `scripts/og-image.html`·`scripts/logo.html`이고, 고친 뒤 다시 뽑으려면:

```bash
CHROME_PATH=/path/to/chrome node apps/product/scripts/make-images.mjs
```

## 성능

모바일 Lighthouse 측정·개선 기록은 [`docs/perf/002-product-lighthouse.md`](../../docs/perf/002-product-lighthouse.md).
**한글 웹폰트를 의도적으로 싣지 않는다** — 이유와 되돌리는 방법이 그 문서에 있다.

## 배포 (Vercel)

`output: 'export'` 정적 산출물을 Vercel에 올린다. 설정은 `vercel.json`에 있고,
클릭 순서는 [S07 배포 절차](../../docs/specs/S07-deployment.md#배포-절차-재현-가능--이-순서대로).

| 항목 | 값 |
|---|---|
| Root Directory | `apps/product` (모노레포 밖 파일 포함 옵션은 켜 둔다) |
| Framework Preset | Next.js (자동 감지 — `output: 'export'` 산출물 `out/`을 Vercel이 알아서 서빙한다) |
| 설치 | `pnpm install --frozen-lockfile` |
| 빌드 | `pnpm --filter @thegame/product build` |

환경변수 2개(`NEXT_PUBLIC_SITE_URL`·`NEXT_PUBLIC_DEMO_URL`)는 위 [환경변수](#환경변수) 표 그대로다.
**둘 다 빌드 시점에 정적 HTML로 구워진다** — 첫 배포로 도메인을 확인한 뒤 값을 넣고
한 번 더 Redeploy 해야 canonical·hreflang·OG·sitemap이 실제 도메인을 가리킨다.
