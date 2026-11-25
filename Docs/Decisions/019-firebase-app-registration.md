# 결정 019: Firebase 웹앱 등록 정보

- 날짜: 2026-11-25
- 상태: 부분 확정

## 제공된 정보

- Firebase 앱 이름: `1209chatapp`
- Firebase 앱 ID: `1:174233430510:web:9ce21e95b97ca5bbcf06ff`

앱 ID는 Git에서 제외되는 `.env.firebase.local`에 기록합니다.

## 현재 적용

- 1시간 로컬 MVP의 데이터베이스는 SQLite를 사용합니다.
- 메시지, 작업 기록과 피드백 접근은 FastAPI 백엔드를 통해서만 처리합니다.
- Firebase 앱 ID만으로 Firestore 인증이나 데이터 접근을 수행하지 않습니다.

## Firestore 전환에 추가로 필요한 항목

- Firebase 프로젝트 ID
- 백엔드 인증 방식: Google Application Default Credentials 또는 Cloud Run 서비스 계정
- 활동, 학생, 메시지, 작업 기록, 피드백 컬렉션 구조
- 교사·학생·모둠 단위 접근 정책
- 보관 기간, 삭제와 백업 정책

실제 키, 서비스 계정 JSON과 기타 인증정보는 저장소와 GitHub에 포함하지 않습니다.
