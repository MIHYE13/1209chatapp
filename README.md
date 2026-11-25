# 모둠 탐구실

초등학교 5~6학년 학생들이 모둠별로 실시간 대화하고, 생성형 AI 보조교사의 도움을 받아 역할과 작업 과정을 구조화하는 교실용 웹앱 MVP입니다.

## 현재 포함된 기능

- 활동 코드, 학급, 이름과 1~6모둠 로그인
- 모둠별 WebSocket 실시간 채팅
- 교사 안내 / 채팅 / 작업 기록의 3분할 화면
- 이끄미, 기록이, 나누미, 지키미 역할 자동 배정
- 링크와 5MB 이하 이미지·PDF 공유
- OpenAI API를 이용한 토큰 절약형 다음 행동 제안
- 학생 확인 후 오른쪽 작업 기록 반영
- 교사용 1~6모둠 관찰 화면
- 서버 기준 활동 타이머
- SQLite 로컬 저장

## 구조

```text
App/Web  - 독립 프론트엔드, Netlify 배포 대상
App/Api  - 독립 FastAPI 백엔드, 컨테이너 배포 대상
```

프론트엔드와 백엔드는 별도 프로세스로 실행되며 HTTP API와 WebSocket으로 통신합니다. OpenAI 키, 교사 코드, 데이터베이스와 업로드 파일은 백엔드에서만 관리합니다.

## 로컬 실행

첫 번째 터미널에서 백엔드를 실행합니다.

```powershell
python -m uvicorn App.Api.main:app --host 0.0.0.0 --port 8000
```

두 번째 터미널에서 프론트엔드를 실행합니다.

```powershell
python -m http.server 5173 --bind 0.0.0.0 --directory App/Web
```

브라우저에서 `http://localhost:5173`을 엽니다. 같은 와이파이의 태블릿에서는 실행 컴퓨터의 내부 IP 주소와 포트 `5173`으로 접속합니다.

## 기본 시연 정보

- 활동 코드: `SCIENCE6`
- 학급: `5학년 1반`
- 교사 코드: `.env.local`의 `TEACHER_CODE` 또는 기본값 `teacher-demo`

## 환경변수

실제 값은 Git에서 제외된 `.env.local`에 저장합니다.

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
TEACHER_CODE=teacher-demo
```

API 키는 브라우저로 전달되지 않으며 OpenAI 호출은 백엔드에서만 수행됩니다.

백엔드에는 실제 프론트엔드 Origin을 설정합니다.

```env
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## 프론트엔드 빌드

프론트엔드는 빌드 시 공개 백엔드 주소를 주입합니다. 두 값은 브라우저에 공개되므로 비밀정보를 넣지 않습니다.

```powershell
$env:API_BASE_URL="https://api.example.com"
$env:WS_BASE_URL="wss://api.example.com"
node App/Web/build.mjs
```

생성 결과는 `App/Web/dist`에 위치합니다.

## Netlify 프론트엔드

저장소 루트의 `netlify.toml`이 다음을 수행합니다.

- 기본 디렉터리: `App/Web`
- 빌드 명령: `node build.mjs`
- 공개 디렉터리: `dist`
- SPA fallback과 기본 보안 헤더

Netlify 빌드 환경변수에 `API_BASE_URL`, `WS_BASE_URL`을 설정해야 합니다.

## 백엔드 컨테이너

저장소 루트에서 다음과 같이 빌드합니다.

```powershell
docker build -f App/Api/Dockerfile -t science-collab-api .
```

운영 백엔드 환경변수에는 `OPENAI_API_KEY`, `OPENAI_MODEL`, `TEACHER_CODE`, `ALLOWED_ORIGINS`를 설정합니다. `ALLOWED_ORIGINS`에는 배포된 Netlify 주소만 허용합니다.

## 현재 MVP의 한계

- 활동 코드와 이름·모둠 번호는 강한 인증 방식이 아닙니다.
- 파일 검사는 형식·용량 제한만 포함하며 운영 수준 악성 파일 검사는 없습니다.
- 로컬 SQLite와 파일 저장소를 사용하므로 백엔드를 여러 인스턴스로 배포하기 전 Firestore와 클라우드 파일 저장소로 전환해야 합니다.
- 정식 운영 전 HTTPS, 데이터 보관·삭제, 백업, 부하 및 학교 기기 검증이 필요합니다.
