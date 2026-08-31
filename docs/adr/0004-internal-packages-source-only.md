# 0004. 공유 패키지는 빌드 산출물 없이 TypeScript 소스로 직접 배포한다

- **상태**: Accepted
- **날짜**: 2026-08-31
- **관련**: [0001](./0001-pnpm-workspace-monorepo.md)

## 맥락 (Context)

`packages/*`(tokens, i18n, realtime, ui)는 이 모노레포의 앱들만 소비하는
내부 패키지다. npm 배포 계획이 없고, 소비자는 Next.js(웹팩/터보팩)와
Expo(Metro)로 각자 번들링한다.

## 결정 (Decision)

내부 패키지는 `exports` 필드가 `src/*.ts`를 직접 가리키게 하고(JIT 패키지 패턴),
빌드 스크립트를 두지 않는다. 트랜스파일은 소비하는 앱이 담당한다
(Next.js `transpilePackages`, Metro는 기본 동작). 패키지별 검증은
`tsc --noEmit`(typecheck)과 테스트로 한다.

## 검토한 대안 (Alternatives)

| 대안 | 장점 | 단점 | 탈락 사유 |
|------|------|------|-----------|
| tsup/rollup으로 사전 빌드 | 소비자 설정 불필요, 외부 배포 가능 | 패키지마다 빌드 설정·워치 파이프라인 필요, dist 동기화 문제 | 내부 소비만 하는데 빌드 인프라 유지 비용이 이득보다 큼 |
| TS Project References | tsc 네이티브 증분 빌드 | Metro/Next와 이중 빌드 체계, 설정 복잡 | 번들러가 이미 트랜스파일을 담당 |

## 결과 (Consequences)

- (+) 패키지 수정이 앱 dev 서버에 즉시 반영 (빌드/워치 단계 없음)
- (+) 패키지당 설정 파일 최소화
- (−) 앱 쪽 설정에 의존: Next.js는 `transpilePackages`에 패키지를 등록해야 함
- (−) 외부(npm) 배포가 필요해지면 이 결정을 뒤집는 새 ADR이 필요
