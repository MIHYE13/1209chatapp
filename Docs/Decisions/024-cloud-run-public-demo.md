# 024. Cloud Run 교실 시연용 공개 배포

- 상태: 승인
- 날짜: 2026-11-26

## 결정

백엔드 전용 저장소 `1209chatapp_back`을 Google Cloud Run에 공개 접근 가능한 교실 시연 서비스로 배포합니다.

## 이번 단계 범위

- Google Cloud 프로젝트 `wepapp-21e9c` 사용
- Cloud Run 최대 인스턴스 수 1개
- 공개 HTTPS 주소 생성
- `/api/health` 응답 검증
- 운영용 `TEACHER_CODE`를 배포 환경의 비밀 설정으로 관리
- 첫 배포는 `DEPLOYMENT_MODE=health-only`로 제한

## 이번 단계 제외

- Netlify 프론트엔드 연결
- 실제 학생 데이터 입력
- OpenAI API 실제 호출
- SQLite·로컬 파일의 Firestore·Cloud Storage 전환
- 다중 인스턴스 확장

## 이유

Netlify와 학생 태블릿이 백엔드에 직접 연결하려면 공개 HTTPS 엔드포인트가 필요합니다. 현재 SQLite와 로컬 파일은 영속 저장에 적합하지 않으므로 이번 배포는 상태 확인용으로 제한합니다.

## 검증 기준

- Cloud Run 배포 상태가 정상이어야 합니다.
- 공개 주소의 `/api/health`가 HTTP 200과 `{"status":"ok"}`를 반환해야 합니다.
- 최대 인스턴스가 1개로 제한되어야 합니다.
- 저장소나 브라우저 번들에 실제 비밀값이 포함되지 않아야 합니다.
- 학생·교사 API는 HTTP 503, WebSocket은 연결 거부 상태여야 합니다.
