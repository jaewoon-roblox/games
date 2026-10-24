# Roblox 독립 자동개발 — 다음 작업자 인수인계

> **기준 시점:** 2026-10-24, KST  
> **작업 대상:** `jaewoon-roblox/games` **만**  
> **PR:** [#1](https://github.com/jaewoon-roblox/games/pull/1) · `work/independent-vibe` → `main` · **Draft / 미병합**  
> **마지막 기능·회귀 검증 SHA:** `b68b6efb0742bab67b181409fa571ffcde9b44bb`  
> **검증 실행:** [GitHub Actions 40064584675](https://github.com/jaewoon-roblox/games/actions/runs/40064584675)  
> **이 문서는 작업 인계용이며 정책 정본·게임 실행 증거·출시 승인이 아니다.** 모든 숫자와 차단 상태는 계속 재검증해야 한다.

## 1. 절대 지킬 경계

- `jaewoon-roblox/games`는 **Roblox 게임만** 개발. 별도 `hans1177/jaewoon-games`는 웹 조직. 웹의 라이브러리 정책은 *참고*할 수 있지만 큐·러너·키·정책·성공 기록을 복제하거나 상태를 섞지 않는다.
- 로블록스 정책 정본은 다음 4개 기존 파일이다. 변경하지 말고 **쓰기 전에 재조회**한다.
  1. `company-learning/platform-release-roadmap.json` (version 596, Roblox ALWAYS_ALLOWED; WEB/UNITY/FORTNITE_UEFN/UNITY_WEB/UNITY_ANDROID OWNER_HOLD)
  2. `company-learning/company-log-map.json` (version 192)
  3. `company-learning/company-architecture-map.json` (version 342, repo: `jaewoon-roblox/games`, OWN_REPOSITORY_ONLY)
  4. `company-learning/security-immune-system.json` (version 93, fail closed)
- 기존 로블록스 게임의 **게임플레이, 밸런스, 저장 키, 경제, 진행, 전투 권한**을 인프라 수정 때문에 변경하지 않는다.
- 정적 Node 검사·Rojo 패키지 빌드는 실제 Studio 플레이/모바일·저장/재접속·F0–F9·게시 성공과 다르다. **증거를 위조하거나 차단 게이트를 풀지 않는다.**
- 자동 출시/게시와 검증 없는 PR 병합 금지. 웹 조직 CI·게임 운영 중단도 금지.

## 2. 현재 검증 상태 — 실제 로그 기준

- 마지막 검증 `b68b6efb0742bab67b181409fa571ffcde9b44bb`: [Actions #40064584675](https://github.com/jaewoon-roblox/games/actions/runs/40064584675), `independent-readiness` **success**, 정책/회귀 검사 **144/144 PASS**, 고정 Rojo 7.7.0로 **6/6 source-package build PASS**.
- 빌드 대상: `simple-rpg`, `insect-survival`, `cozy-island`, `fantasy-survival`, `daechung-rpg`, `bug-defense`.
- 같은 Actions에서 `resolve-seed-targets`, `design-cycle`, `sync-strict-design-scores`는 PR 이벤트 보호로 **skipped**. 자동개발 실작업 성공을 뜻하지 않는다.
- **진짜 차단 로그:** `ROBLOX_CANONICAL_PLAN_RESERVE_ORDER`는 queued 6 / reserved true이지만 `workOrderRun:false`. 직접 게임 코드 한방패치 `ROBLOX_CANONICAL_GAME_PRIMARY_ORDER`도 reserved true / run false. 사유: `VERIFIED_COMMERCIAL_BLACK_BOX_DISTILLATION_REQUIRED_FOR_INTERNAL_ASSET_PRODUCTION`.
- 중앙정책에는 로블록스 **기존 소스 유지보수도 검증된 외부 학습 없이는 금지**하는 조항이 있다. 이미 한때 느슨해졌던 조건을 복원함. **게임 코드/자산 모두 학습 게이트를 우회하면 안 된다.**
- 실제 Roblox Studio 플레이·실제 작업자 소스 diff·비공개 후보 배포·F0–F9·최종 게시: **UNVERIFIED**.

## 3. 자체 실행 상태 (웹 조직과 독립)

- `vibe2-unreal-core:.vibe2/queue.json`: `tasks=[]` (0개). 역사적 브랜치명에 `unreal`이 있지만 소유 저장소는 Roblox.
- `vibe2-unreal-core:.vibe2/parallelism-control.json`: `currentMax=256` **설정값**, 실근무 작업자 256명이 동작한다는 뜻 아님.
- `company-runtime:development-queue.json`: `items=[]` (0개).
- `vibe2-learning-runtime:company-learning/vibe3-roblox-distillation-ledger.json`: `records=[]` (0개).
- `vibe2-learning-runtime`에 정규 `company-learning/vibe3-task-playbooks.json` **없음**. `vibe2-continuous-core.yml`이 이 파일을 필수로 `git show`하며 `generatedFrom=VERIFIED_MEMORY_ONLY`, `taskTypes`/검증된 재사용 근거를 요구한다. **빈 플레이북을 VERIFIED로 표시하지 말 것.**
- `company-runtime:artbook-submissions/.gitkeep`은 24H 계획기의 존재 요구 충족을 위해 복구함. **빈 디렉터리**이지 승인된 설계/아트북이 아니다.

## 4. 반영한 코드 변경 사항

- `tools/company-shared-context.mjs`: 없는 웹측 `company-directive.json` 대신 로블록스 정책 정본 4개로 무결성 검증. 정책 검사 자체는 쓰기/출시 권한을 주지 않는다.
- `qa/company-four-docs-fingerprint.test.mjs`, `qa/company-shared-context-retained.test.mjs`, `qa/company-policy-steward.test.mjs`: 원본 SHA 핀, 보류 플랫폼/해시/차단 회귀.
- `tools/vibe2-auto-planner.mjs`: 기존 6게임 우선 선별, 후보 우선순위 복구. 자동 생성되는 CC0 교체는 **asset-production lane**; 일반 게임 코드 lane으로 분장해 게이트를 우회하지 않는다.
- `tools/vibe2-asset-production-plan.mjs`: 자산과 기존 로블록스 소스 모두 검증된 외부 학습 선행 요구 보존.
- `assets/asset-selector.js`: 기존 검증 CC0 자산 우선 검색 후 게임 스타일에 맞게 색·재질·크기/호환 모션을 **소폭 수정** 가능. 출처, 원본 SHA, 수정본 별도 SHA 및 실제 네이티브 런타임 재검증 필요.
- `assets/asset-license-ledger.json`: 로블록스 독립 출처/라이선스 장부 생성. **entries=[]**는 신뢰할 수 있는 항목을 아직 증명하지 못했다는 의미. 웹 장부의 항목이나 미확인 CC0를 그대로 검증됨으로 승격하지 않는다.
- `.github/workflows/company-seed-design-runtime.yml`: `main` 병합 전 PR에서는 `independent-readiness`만 실행. 실제 설계 흐름에 남아 있던 웹 지시서 읽기를 로블록스 정본으로 대체하고, 로블록스 설계 seed만 허용.
- `.github/workflows/vibe2-24h-runner.yml`: 웹 전용 게임플레이/웹 학습 작업을 기존 계획기에서 격리하는 복구 반영.
- 원본 기존 Vibe2 설계·복구·학습 실행 모듈 및 핵심 QA 일부를 Roblox 조직으로 복구하고 의존성 검사 통과. 특히 최신 `b68b6ef`에서는 **로블록스 자체 teacher corpus 부재** 때문에 learning-practice를 성공으로 처리하지 않도록 변경.

## 5. 남은 차단·불완전성 — 작업 우선순위

**P0. 진짜 로블록스 자체 verified-learning 근거 확보.** 원본 웹 조직의 학습 기록·PASS를 복사하지 않는다. Roblox 조직이 자체적으로 재현 가능한 승인 관측/출처·해시·검증 증거를 갖춘 후 정규 학습 파이프라인으로 Playbook을 생성해야 한다. `generatedFrom=VERIFIED_MEMORY_ONLY`나 `verified-task-playbook`을 거짓으로 넣지 않는다. 그 전에는 소스 생성 차단이 정상이다.

**P1. 기존 24H/Core 워크플로의 실제 누락 의존성 복구 또는 정당한 플랫폼 격리.** 현재 PR 트리 기준 workflow 문자열 경로 검사에서 **고유 누락 경로 43개** (24H 28개, Core 22개, 디자인 0개). 특히 `qa/vibe2-central-work-contract.test.mjs`, `qa/vibe2-auto-planner.test.mjs`, `qa/vibe2-source-worker.test.mjs`, `qa/vibe2-native-asset-production.test.mjs`, `qa/vibe2-learning-motor.test.mjs` 및 다른 복구 QA, 일부 운영 모듈. 이 숫자는 **문자열 참조 개수**이지 실행에 모두 필수라는 증거가 아니므로 스텝 단위로 분류할 것. 웹/유니티 코드를 무조건 가져오거나 무조건 PASS 처리하지 말 것.

**P2. 실제 실행기/권한/비공개 로블록스 런타임 가용성 확인.** 자신의 조직 Actions queue, runner, `VIBE2_GEMINI...` 공급자·토큰·Roblox 게시 인증과 보안 경계를 실제 실행에 맞춰 확인. 키 값은 출력/저장하지 말 것. PR 이벤트의 skipped 결과를 근거로 main에 활성화하지 말 것.

**P3. 안전한 단일 게임 end-to-end 실증.** 정책과 학습/의존성이 충족될 때 **자체 큐**에서 1개 제한적 작업을 예약 → 실제 작업자 출범 → 격리 후보 Luau diff → 보안/증분 QA → 동일 커밋·아티팩트 비공개 Roblox 테스트 → F0~F9 실측 → 결과 fan-in 및 큐 상태 전이 확인. 실패·미관측은 PASS로 변조 금지. 성공 후에만 다른 5개 게임과 작업 병렬성 확대.

**P4. Draft PR #1 → main 병합 판단.** 계획기/워크플로를 `main`에 활성화하면 기존 5분 스케줄러가 반복 실행될 수 있다. 필요한 모듈·학습·실행 환경·보안 QA가 준비되기 전에는 **보류**.

## 6. 재개 실무 절차

1. `get_pr_info(jaewoon-roblox/games, #1)`로 최신 `work/independent-vibe` HEAD를 확인. 이 문서의 SHA보다 앞/뒤로 이동했으면 **실제 최신 SHA**를 우선하며 동시 수정에는 optimistic `expected_sha` 적용.
2. 쓰기 전 **정본 정책 4개**를 해당 브랜치에서 재조회. Roblox-only/타 플랫폼 OWNER_HOLD/원본 불변 확인.
3. 최신 Actions `independent-readiness`의 **테스트 개수·실패 항목·로블록스 6게임 빌드** 확인. `design-cycle skipped`를 성공으로 기재하지 않는다.
4. 실상태 3브랜치의 **큐·개발 항목·증류/학습 기록**을 재조회. 새 작업·PASS를 가정하지 않는다.
5. P0–P4 순서로 원래 모듈을 복구. GitHub PR #1에 코드 SHA, 실제 검사 Run URL, 다음 차단 원인을 남긴다.

### 참고 URL

- [작업 PR #1](https://github.com/jaewoon-roblox/games/pull/1)
- [현재 확인된 마지막 사전검증: Run 40064584675](https://github.com/jaewoon-roblox/games/actions/runs/40064584675)
- [이전 복구 인수인계 댓글](https://github.com/jaewoon-roblox/games/pull/1#issuecomment-6379967910)

**요약:** 이 저장소에서 증명된 것은 정책/회귀 및 6게임 소스 빌드까지다. 자동개발 *정상 실동작*은 아직 증명되지 않았다. 다음 작업자는 검증된 외부 학습·누락 24H/Core 의존성·실행기/런타임 검증을 끝내야 하며, Roblox-only 안전 경계와 기존 게임 상태를 보존해야 한다.
