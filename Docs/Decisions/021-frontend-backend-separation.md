# 결정 021: 프론트엔드·백엔드 독립 실행 및 배포

- 날짜: 2026-11-25
- 상태: 구현 및 검증 완료

## 결정

프론트엔드와 백엔드를 폴더뿐 아니라 실행·배포 단위에서도 분리합니다.

### 프론트엔드

- 위치: `App/Web`
- 구성: HTML, CSS, Vanilla JavaScript
- 독립 정적 서버에서 실행
- 빌드 시 `API_BASE_URL`, `WS_BASE_URL` 공개 환경변수 주입
- Netlify 배포 설정 제공
- 비밀키와 서버 인증정보를 포함하지 않음

### 백엔드

- 위치: `App/Api`
- 구성: FastAPI, WebSocket, SQLite, OpenAI SDK
- JSON API, WebSocket과 업로드 파일만 제공
- 프론트엔드 HTML·CSS·JavaScript를 제공하지 않음
- 허용된 프론트엔드 Origin에만 CORS 응답
- 컨테이너 배포용 Dockerfile 제공

## 로컬 포트

- 프론트엔드: `5173`
- 백엔드: `8000`

## 검증 결과

- 두 서버가 독립 프로세스로 실행됨
- 백엔드 루트는 서비스 상태 JSON만 반환함
- 프론트엔드가 CORS를 통해 백엔드 로그인 API 호출
- 프론트엔드가 별도 백엔드 WebSocket 연결
- 학생 3분할 화면과 타이머 표시 정상
- 프론트엔드 정적 빌드 성공

## 남은 운영 전환

- SQLite를 Firestore로 전환
- 로컬 업로드를 클라우드 파일 저장소로 전환
- 배포된 프론트엔드 주소를 백엔드 `ALLOWED_ORIGINS`에 설정
- 백엔드 주소를 Netlify `API_BASE_URL`, `WS_BASE_URL`에 설정
