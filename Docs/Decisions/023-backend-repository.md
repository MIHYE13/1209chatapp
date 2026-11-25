# 023. 백엔드 전용 GitHub 저장소

- 상태: 확정
- 날짜: 2026-11-25

## 결정

- 프론트엔드·전체 작업 저장소: `https://github.com/MIHYE13/1209chatapp.git`
- 백엔드 배포 저장소: `https://github.com/MIHYE13/1209chatapp_back.git`
- `App/Api` 디렉터리를 백엔드 저장소의 루트로 배포합니다.

## 영향

백엔드 Dockerfile은 `requirements.txt`와 `main.py`가 저장소 루트에 있는 독립 빌드 컨텍스트를 사용합니다. 기존 전체 저장소에서는 `docker build -f App/Api/Dockerfile App/Api`로 같은 이미지를 빌드합니다.
