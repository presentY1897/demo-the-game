# S11. corporate 접기 반영·문서 정리

- **갈래**: 문서 · **의존**: S07(배포 링크) 일부 · **판정**: 대기

## 배경

corporate 앱은 만들지 않기로 확정했다(2026-09-01, 점검 문서 질문 A). README 구조 표에는
아직 corporate가 남아 실제 디렉토리와 불일치하고, 루트 README의 "(각 앱 README 추가
예정)"도 미해소다(product README 부재). SEO 역량 증빙은 별도 앱 대신 product에 얹는다.

## 명세

### product에 회사 소개 + SEO

- 랜딩에 간결한 회사 소개 섹션(미션 1문단 + 두 제품 링크) 추가 — 페이지 신설 없음.
- SEO 세트:
  - `generateMetadata` 전 페이지 title/description (로케일별)
  - OG 이미지(정적 1종) + og/twitter 메타
  - `sitemap.xml` · `robots.txt` (Next 컨벤션 파일)
  - ko/en `hreflang` 교차 링크 (`alternates.languages`)
  - 조직 JSON-LD 1건
- S09 재측정과 순서 조율(섹션 추가 → 측정).

### README·문서 정리

- 루트 README: 구조 표에서 corporate 행 제거, 상단에 배포 링크 4종(S07)·데모 GIF 1~2개,
  워크스페이스별 실행법을 각 앱 README로 연결("추가 예정" 문구 해소).
- `apps/product/README.md` 신설 (실행·구조·환경변수).
- CLAUDE.md의 구조 목록에서 corporate 제거.
- 점검 문서(2026-09-01-checkpoint)는 이력으로 보존 — 결정만 반영, 소급 수정하지 않음.

## 완성 기준

1. README/CLAUDE.md와 실제 디렉토리 구조가 일치한다.
2. 배포 링크·GIF가 README 상단에서 동작한다.
3. product에 회사 소개 섹션과 SEO 세트가 반영되고, `curl`로 sitemap/robots/메타 확인 가능.
4. 모든 앱에 README가 있다.

## 테스트

- 자동: 빌드 산출물에 `sitemap.xml`·`robots.txt` 존재와 페이지별 title/OG/hreflang 메타
  포함을 검사하는 간단한 테스트(빌드 후 파일/HTML 검사).
- 수동: README 링크 전수 클릭, 구조 표 ↔ 실제 디렉토리 대조, JSON-LD를 구글 리치 결과
  테스트 도구로 확인.

## 작업 분해

1. product 회사 소개 섹션 + i18n 문자열
2. SEO 세트 (metadata/sitemap/robots/OG/hreflang/JSON-LD)
3. README·CLAUDE.md 정리 + product README
4. 데모 GIF 캡처 (배포 후)

## 범위 제외

블로그/채용 페이지, 다국어 3개 이상, OG 이미지 동적 생성.
