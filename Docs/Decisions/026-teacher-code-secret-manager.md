# 026. 교사 코드 Secret Manager 참조 연결

- 상태: 참조 설정 완료, 실행 계정 권한 승인 대기
- 날짜: 2026-11-27

## 결정

Cloud Run의 `TEACHER_CODE`는 일반 환경변수 값으로 저장하지 않고 Google Secret Manager의 보안 비밀 버전을 환경변수로 참조합니다.

## 이번 단계 범위

- 기존 로컬 `.env.local`의 교사 코드는 사용자가 Google Secret Manager 입력 화면에서 직접 입력
- 보안 비밀 이름과 Cloud Run 환경변수 이름은 값이 아닌 식별자로만 확인
- Cloud Run은 `DEPLOYMENT_MODE=health-only`를 유지
- 새 버전 배포 후 현재 구성에 평문 교사 코드가 없고 보안 비밀 참조만 있는지 확인

## 제외 범위

- OpenAI API 키 생성·조회·연결
- `DEPLOYMENT_MODE=full` 전환
- 학생·교사 로그인 활성화
- 실제 학생 데이터 입력

## 검증 방법

- 비밀 입력 전 자동화 제어를 사용자에게 넘김
- 사용자가 입력·생성을 완료한 뒤 비밀값이 없는 Cloud Run 상위 설정 화면으로 이동했음을 확인
- 자동화 재개 후 `TEACHER_CODE`가 보안 비밀 참조 섹션에만 존재하는지 확인
- 일반 환경변수에는 `DEPLOYMENT_MODE`, `ALLOWED_ORIGINS`만 남아 있는지 확인
- 공개 `/api/health` 정상과 학생 로그인 안전 모드 차단을 재확인

## 2026-11-27 적용 결과

- 기존 Secret Manager 보안 비밀 `TEACHER_CODE`와 버전 `latest`를 Cloud Run의 환경변수 `TEACHER_CODE` 참조로 선택함
- 일반 환경변수에는 `DEPLOYMENT_MODE=health-only`, `ALLOWED_ORIGINS`만 남아 있음을 확인함
- OpenAI 키는 생성·조회·연결·변경하지 않음
- 새 버전 생성 단계에서 실행 서비스 계정에 `TEACHER_CODE` 비밀 접근 권한이 없어 배포가 실패함
- 실패한 새 버전은 트래픽을 받지 않으며 기존 정상 버전이 계속 서비스함
- 공개 `/api/health`의 `{"status":"ok"}` 응답과 Netlify 학생 로그인 화면 표시를 확인함

## 다음 승인 단위

- Cloud Run 실행 서비스 계정에 `TEACHER_CODE` 보안 비밀 범위의 `Secret Manager Secret Accessor` 역할을 부여
- 프로젝트 전체가 아닌 해당 보안 비밀에만 권한을 한정
- 같은 참조 구성으로 재배포 후 새 버전 정상 상태와 `health-only` 차단을 검증
- 권한 변경은 사용자 확인 전에는 수행하지 않음
