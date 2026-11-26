# 교실 시연 MVP 검증 기록

- 검증일: 2026-11-25

## 자동 검사

- Python 백엔드 문법 검사 통과
- JavaScript 문법 검사 통과
- 백엔드 상태 API 통과
- 학생 로그인 및 네 역할 배정 통과
- 교사 1~6모둠 조회 통과
- 두 학생 WebSocket 메시지 동기화 통과
- 서버 시간 기반 활동 열림·종료 판정 통과
- 이미지 업로드 형식·경로 처리 통과
- `DEPLOYMENT_MODE=health-only`에서 `/api/health` HTTP 200 확인
- `DEPLOYMENT_MODE=health-only`에서 학생 로그인 API HTTP 503 차단 확인

## 브라우저 검사

- 학생 로그인 화면 표시 확인
- 모바일 폭의 중앙 채팅 우선 화면 확인
- 모바일 탭으로 수업 안내·채팅·작업 기록 전환 확인
- 메시지 전송과 AI 응답 표시 확인
- AI 작업 초안의 확인 대기 상태 확인
- 학생 확인 후 확정 상태 전환 확인
- 교사 화면의 1~6모둠 탭과 관찰 데이터 확인
- AI 과정 피드백 초안 생성 확인
- 교사 확인 후 학생 공개 저장 확인

## 현장 검증 필요

- 태블릿 4대와 교사 기기의 동일 와이파이 접속
- 학교 네트워크의 WebSocket 허용 여부
- 40분 이상 연결 유지와 재접속
- 학생 이름·모둠 오입력 대응
- 파일 업로드 속도와 용량
- 수업 종료 시 모든 기기의 동시 잠금

## 2026-11-26 Cloud Run 배포 검증

- GitHub `1209chatapp_back` 커밋 `15bff0a` 자동 빌드·배포 성공
- Cloud Run 최신 버전이 트래픽 100% 처리함
- 공개 HTTPS `/api/health` 응답 `{"status":"ok"}` 확인
- `health-only`에서 `/api/login` 차단 응답 확인
- 최소 인스턴스 0개, 최대 인스턴스 1개 확인
- 실제 학생 로그인·채팅은 `TEACHER_CODE`, 허용 프론트엔드 주소와 데이터 보관 구성을 완료한 뒤 별도 검증함

## 2026-11-27 비밀정보 노출 대응 검증

- Cloud Run 일반 환경변수에 잘못 입력된 `OPENAI_API_KEY`와 `TEACHER_CODE` 삭제 완료
- 중복 `ALLOWED_ORIGINS` 항목 삭제 완료
- `DEPLOYMENT_MODE=health-only` 복구 및 새 버전 배포 완료
- Cloud Run 정상 상태와 트래픽 전환 완료 확인
- 공개 HTTPS `/api/health` 응답 `{"status":"ok"}` 재확인
- 노출된 OpenAI 키 폐기·신규 키 발급과 Secret Manager 참조 연결은 다음 승인 단계에서 수행
