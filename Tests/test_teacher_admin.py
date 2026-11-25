"""교사 관리자 API를 독립 시험 활동으로 검증한다."""

from __future__ import annotations

import json
import os
import sqlite3
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import websockets

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from App.Api.main import DB_PATH


BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws"
TEACHER_HEADERS = {"X-Teacher-Code": os.getenv("TEACHER_CODE", "teacher-demo")}


def create_test_activity(code: str) -> None:
    now = datetime.now(timezone.utc)
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """INSERT INTO activities
            (code, class_name, topic, objective, steps_json, started_at, ends_at, active)
            VALUES (?, '시험 학급', '관리 기능 시험', '관리 기능을 안전하게 검증한다.', '[]', ?, ?, 1)""",
            (code, now.isoformat(), (now + timedelta(minutes=10)).isoformat()),
        )


def remove_test_activity(code: str) -> None:
    with sqlite3.connect(DB_PATH) as connection:
        activity = connection.execute("SELECT id FROM activities WHERE code = ?", (code,)).fetchone()
        if not activity:
            return
        activity_id = activity[0]
        for table in ("messages", "work_items", "feedback", "students"):
            connection.execute(f"DELETE FROM {table} WHERE activity_id = ?", (activity_id,))
        connection.execute("DELETE FROM activities WHERE id = ?", (activity_id,))


def login(code: str, name: str, group_no: int) -> dict:
    response = httpx.post(
        f"{BASE_URL}/api/login",
        json={"activity_code": code, "class_name": "시험 학급", "name": name, "group_no": group_no},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


async def verify_admin_flow() -> None:
    code = f"TEST{uuid.uuid4().hex[:8].upper()}"
    create_test_activity(code)
    try:
        first = login(code, "관리시험가", 1)
        second = login(code, "관리시험나", 1)
        overview = httpx.get(f"{BASE_URL}/api/teacher/overview/{code}", headers=TEACHER_HEADERS, timeout=10)
        overview.raise_for_status()
        members = overview.json()["groups"][0]["members"]
        first_id = next(member["id"] for member in members if member["name"] == "관리시험가")
        second_id = next(member["id"] for member in members if member["name"] == "관리시험나")

        moved = httpx.put(
            f"{BASE_URL}/api/teacher/students/{first_id}",
            headers=TEACHER_HEADERS,
            json={"group_no": 2},
            timeout=10,
        )
        moved.raise_for_status()
        assert moved.json()["groupNo"] == 2

        removed = httpx.delete(
            f"{BASE_URL}/api/teacher/students/{second_id}", headers=TEACHER_HEADERS, timeout=10
        )
        removed.raise_for_status()
        assert removed.json()["deleted"] is True

        async with websockets.connect(f"{WS_URL}?token={first['token']}") as socket:
            await socket.recv()
            await socket.send(json.dumps({"type": "message", "content": "관리 기능 시험 메시지"}, ensure_ascii=False))
            while json.loads(await socket.recv()).get("type") != "message":
                pass

        reset_conversation = httpx.delete(
            f"{BASE_URL}/api/teacher/groups/{code}/2/conversation",
            headers=TEACHER_HEADERS,
            timeout=10,
        )
        reset_conversation.raise_for_status()
        assert reset_conversation.json()["deletedMessages"] == 1

        reset_students = httpx.delete(
            f"{BASE_URL}/api/teacher/activities/{code}/students",
            headers=TEACHER_HEADERS,
            timeout=10,
        )
        reset_students.raise_for_status()
        assert reset_students.json()["deletedStudents"] == 1
    finally:
        remove_test_activity(code)


if __name__ == "__main__":
    import asyncio

    asyncio.run(verify_admin_flow())
    print("Teacher admin integration checks passed")
