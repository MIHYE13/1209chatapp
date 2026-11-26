"""`health-only` 차단 응답에도 허용된 프론트엔드 CORS 헤더가 붙는지 검사한다."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


with tempfile.TemporaryDirectory() as data_dir:
    os.environ["APP_DATA_DIR"] = data_dir
    os.environ["DEPLOYMENT_MODE"] = "health-only"
    os.environ["ALLOWED_ORIGINS"] = "https://1209chatapp.netlify.app"

    from fastapi.testclient import TestClient

    from App.Api.main import app

    with TestClient(app) as client:
        response = client.post(
            "/api/login",
            headers={"Origin": "https://1209chatapp.netlify.app"},
            json={
                "activity_code": "SCIENCE6",
                "class_name": "5학년 1반",
                "name": "배포확인",
                "group_no": 1,
            },
        )

    assert response.status_code == 503
    assert response.json() == {"detail": "배포 상태 확인 중입니다."}
    assert response.headers["access-control-allow-origin"] == "https://1209chatapp.netlify.app"

print("health-only CORS check passed")
