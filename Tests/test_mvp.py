"""실행 중인 로컬 서버를 대상으로 하는 핵심 MVP 통합 검사."""

from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import websockets

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from App.Api.main import activity_open


BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws"


def login(name: str, group_no: int) -> dict:
    response = httpx.post(
        f"{BASE_URL}/api/login",
        json={
            "activity_code": "SCIENCE6",
            "class_name": "5학년 1반",
            "name": name,
            "group_no": group_no,
        },
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


async def receive_type(socket, expected: str, attempts: int = 5) -> dict:
    for _ in range(attempts):
        event = json.loads(await asyncio.wait_for(socket.recv(), timeout=3))
        if event.get("type") == expected:
            return event
    raise AssertionError(f"Expected event type {expected!r}")


async def verify_websocket() -> None:
    first = login("새봄", 2)
    second = login("누리", 2)
    async with websockets.connect(f"{WS_URL}?token={first['token']}") as one:
        await receive_type(one, "presence")
        async with websockets.connect(f"{WS_URL}?token={second['token']}") as two:
            await receive_type(one, "presence")
            await receive_type(two, "presence")
            await one.send(json.dumps({"type": "message", "content": "증발 조건을 온도와 바람으로 나눠 볼까요?"}, ensure_ascii=False))
            one_event = await receive_type(one, "message")
            two_event = await receive_type(two, "message")
            assert one_event["message"]["content"] == two_event["message"]["content"]
            assert two_event["message"]["sender"] == "새봄"


def verify_http() -> None:
    health = httpx.get(f"{BASE_URL}/api/health", timeout=10)
    health.raise_for_status()
    assert health.json()["status"] == "ok"
    overview = httpx.get(
        f"{BASE_URL}/api/teacher/overview/SCIENCE6",
        headers={"X-Teacher-Code": "teacher-demo"},
        timeout=10,
    )
    overview.raise_for_status()
    assert len(overview.json()["groups"]) == 6


def verify_timer_logic() -> None:
    past = {"active": 1, "ends_at": (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()}
    future = {"active": 1, "ends_at": (datetime.now(timezone.utc) + timedelta(seconds=30)).isoformat()}
    assert activity_open(past) is False
    assert activity_open(future) is True


if __name__ == "__main__":
    verify_http()
    verify_timer_logic()
    asyncio.run(verify_websocket())
    print("MVP integration checks passed")
