const state = {
  token: localStorage.getItem("science-room-token") || "",
  student: null,
  activity: null,
  members: [],
  messages: [],
  workItems: [],
  feedback: null,
  socket: null,
  timerHandle: null,
  teacherCode: sessionStorage.getItem("teacher-code") || "",
  teacherActivityCode: sessionStorage.getItem("teacher-activity") || "",
  teacherData: null,
  selectedGroup: 1,
  teacherPoll: null,
  feedbackDrafts: {},
};

const runtimeConfig = window.APP_CONFIG || {};
const API_BASE_URL = String(runtimeConfig.API_BASE_URL || `http://${location.hostname}:8000`).replace(/\/$/, "");
const WS_BASE_URL = String(
  runtimeConfig.WS_BASE_URL || API_BASE_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:")
).replace(/\/$/, "");

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 2800);
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.token) headers.set("Authorization", `Bearer ${state.token}`);
  if (options.json) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.json);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = "요청을 처리하지 못했습니다.";
    try { message = (await response.json()).detail || message; } catch (_) {}
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

function switchLoginMode(mode) {
  const studentMode = mode === "student";
  $("#student-login").hidden = !studentMode;
  $("#teacher-login").hidden = studentMode;
  $("#student-tab").classList.toggle("is-active", studentMode);
  $("#teacher-tab").classList.toggle("is-active", !studentMode);
  $("#student-tab").setAttribute("aria-selected", String(studentMode));
  $("#teacher-tab").setAttribute("aria-selected", String(!studentMode));
  $("#login-error").hidden = true;
}

function showView(view) {
  $("#login-view").hidden = view !== "login";
  $("#student-view").hidden = view !== "student";
  $("#teacher-view").hidden = view !== "teacher";
}

function formatTime(iso) {
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function renderRichText(element, text) {
  element.textContent = "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  for (const match of text.matchAll(urlRegex)) {
    element.append(document.createTextNode(text.slice(lastIndex, match.index)));
    const link = document.createElement("a");
    link.href = match[0];
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = match[0];
    link.title = "외부 사이트 열기";
    element.append(link);
    lastIndex = match.index + match[0].length;
  }
  element.append(document.createTextNode(text.slice(lastIndex)));
}

function renderActivity() {
  const activity = state.activity;
  $("#student-group").textContent = `${state.student.groupNo}모둠`;
  $("#student-identity").textContent = `${state.student.name} · ${state.student.role}`;
  $("#activity-topic").textContent = activity.topic;
  $("#activity-objective").textContent = activity.objective;
  const steps = $("#activity-steps");
  steps.textContent = "";
  activity.steps.forEach((step) => {
    const item = document.createElement("li");
    item.textContent = step;
    steps.append(item);
  });
  renderMembers();
  startTimer(activity.endsAt, "#timer", () => lockComposer());
}

function renderMembers() {
  $("#member-count").textContent = `${state.members.length}명 접속`;
  const list = $("#member-list");
  list.textContent = "";
  state.members.forEach((member) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = member.name;
    const role = document.createElement("span");
    role.className = "role-badge";
    role.textContent = member.role;
    item.append(name, role);
    list.append(item);
  });
}

function startTimer(endsAt, selector, onEnd = () => {}) {
  clearInterval(state.timerHandle);
  const element = $(selector);
  const update = () => {
    const remaining = Math.max(0, new Date(endsAt).getTime() - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    element.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    element.classList.toggle("is-ending", remaining > 0 && remaining <= 5 * 60000);
    element.classList.toggle("is-over", remaining === 0);
    if (remaining === 0) {
      clearInterval(state.timerHandle);
      onEnd();
    }
  };
  update();
  state.timerHandle = setInterval(update, 1000);
}

function lockComposer() {
  $("#message-input").disabled = true;
  $("#message-form button").disabled = true;
  $("#file-input").disabled = true;
  $("#ai-help").disabled = true;
  $("#chat-status").textContent = "활동 시간이 끝났습니다. 지금까지의 기록은 계속 볼 수 있어요.";
}

function renderMessages() {
  const list = $("#message-list");
  list.textContent = "";
  state.messages.forEach((message) => list.append(createMessageNode(message)));
  list.scrollTop = list.scrollHeight;
}

function createMessageNode(message) {
  const item = document.createElement("li");
  item.className = "message";
  if (message.sender === state.student?.name) item.classList.add("is-mine");
  if (message.kind === "ai" || message.sender === "AI 보조교사") item.classList.add("is-ai");
  const meta = document.createElement("div");
  meta.className = "message-meta";
  const sender = document.createElement("strong");
  sender.textContent = message.sender;
  const role = document.createElement("span");
  role.textContent = message.role;
  const time = document.createElement("time");
  time.dateTime = message.createdAt;
  time.textContent = formatTime(message.createdAt);
  meta.append(sender, role, time);
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  renderRichText(bubble, message.content || "파일을 공유했습니다.");
  if (message.attachment) {
    const file = document.createElement("a");
    file.className = "attachment-link";
    file.href = message.attachment.url.startsWith("http")
      ? message.attachment.url
      : `${API_BASE_URL}${message.attachment.url}`;
    file.target = "_blank";
    file.rel = "noopener";
    file.textContent = `첨부 파일 · ${message.attachment.name}`;
    bubble.append(file);
  }
  item.append(meta, bubble);
  return item;
}

function renderWorkItems() {
  const container = $("#work-items");
  container.textContent = "";
  $("#work-empty").hidden = state.workItems.length > 0;
  state.workItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = `work-card ${item.status === "확인 대기" ? "is-pending" : ""}`;
    const header = document.createElement("div");
    header.className = "work-card-header";
    const person = document.createElement("div");
    person.className = "work-person";
    person.textContent = `${item.studentName} · ${item.role}`;
    const status = document.createElement("span");
    status.className = "work-status";
    status.textContent = item.status;
    header.append(person, status);
    const body = document.createElement("div");
    body.className = "work-card-body";
    if (item.status === "확인 대기") {
      const form = document.createElement("form");
      form.className = "work-edit";
      const task = document.createElement("input");
      task.value = item.task;
      task.maxLength = 300;
      task.setAttribute("aria-label", "할 일");
      const process = document.createElement("textarea");
      process.value = item.process;
      process.maxLength = 500;
      process.rows = 2;
      process.setAttribute("aria-label", "지금까지의 과정");
      const button = document.createElement("button");
      button.className = "confirm-button";
      button.textContent = "학생 확인 후 기록하기";
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        button.disabled = true;
        try {
          await api(`/api/work-items/${item.id}/confirm`, { method: "POST", json: { task: task.value, process: process.value } });
          showToast("확인한 작업을 기록했습니다.");
        } catch (error) { showToast(error.message); }
        finally { button.disabled = false; }
      });
      form.append(task, process, button);
      body.append(form);
    } else {
      const task = document.createElement("p");
      task.textContent = item.task;
      const process = document.createElement("p");
      process.className = "work-process";
      process.textContent = item.process || "과정 기록을 이어서 채워 보세요.";
      body.append(task, process);
    }
    card.append(header, body);
    container.append(card);
  });
  renderStudentFeedback();
}

function renderStudentFeedback() {
  const card = $("#student-feedback");
  card.hidden = !state.feedback;
  if (state.feedback) $("#student-feedback-content").textContent = state.feedback.content;
}

function upsertWorkItem(item) {
  const index = state.workItems.findIndex((existing) => existing.id === item.id);
  if (index >= 0) state.workItems[index] = item;
  else state.workItems.unshift(item);
  renderWorkItems();
}

function connectSocket() {
  if (state.socket) state.socket.close();
  const socket = new WebSocket(`${WS_BASE_URL}/ws?token=${encodeURIComponent(state.token)}`);
  state.socket = socket;
  socket.addEventListener("open", () => {
    $("#connection-state").textContent = "실시간 연결";
    $("#connection-state").classList.add("is-online");
    $("#chat-status").textContent = "같은 모둠의 대화가 바로 공유됩니다.";
  });
  socket.addEventListener("message", ({ data }) => {
    const event = JSON.parse(data);
    if (event.type === "message") {
      state.messages.push(event.message);
      const list = $("#message-list");
      list.append(createMessageNode(event.message));
      list.scrollTop = list.scrollHeight;
    } else if (event.type === "work_item") {
      upsertWorkItem(event.workItem);
    } else if (event.type === "feedback") {
      state.feedback = event.feedback;
      renderStudentFeedback();
      showToast("선생님이 과정 피드백을 공개했습니다.");
    } else if (event.type === "presence") {
      $("#chat-status").textContent = event.message;
      setTimeout(refreshBootstrap, 300);
    } else if (event.type === "error") {
      showToast(event.message);
    }
  });
  socket.addEventListener("close", () => {
    $("#connection-state").textContent = "연결 끊김";
    $("#connection-state").classList.remove("is-online");
    if (!$("#student-view").hidden) setTimeout(connectSocket, 1800);
  });
}

async function refreshBootstrap() {
  try {
    const data = await api("/api/bootstrap");
    state.student = data.student;
    state.activity = data.activity;
    state.members = data.members;
    state.messages = data.messages;
    state.workItems = data.workItems;
    state.feedback = data.feedback;
    renderActivity();
    renderMessages();
    renderWorkItems();
  } catch (_) {}
}

async function enterStudentRoom() {
  const data = await api("/api/bootstrap");
  state.student = data.student;
  state.activity = data.activity;
  state.members = data.members;
  state.messages = data.messages;
  state.workItems = data.workItems;
  state.feedback = data.feedback;
  showView("student");
  renderActivity();
  renderMessages();
  renderWorkItems();
  connectSocket();
  $("#chat-panel").classList.add("is-mobile-active");
}

async function sendMessage(event) {
  event.preventDefault();
  const input = $("#message-input");
  const content = input.value.trim();
  if (!content || !state.socket || state.socket.readyState !== WebSocket.OPEN) return;
  state.socket.send(JSON.stringify({ type: "message", content }));
  input.value = "";
  input.style.height = "auto";
}

async function handleFile(file) {
  if (!file) return;
  $("#upload-state").textContent = `${file.name} 올리는 중…`;
  try {
    const attachment = await api(`/api/files?filename=${encodeURIComponent(file.name)}`, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    state.socket.send(JSON.stringify({ type: "message", content: `${file.name} 자료를 공유했어요.`, attachment }));
    $("#upload-state").textContent = "파일을 모둠에 공유했습니다.";
  } catch (error) {
    $("#upload-state").textContent = error.message;
  }
  $("#file-input").value = "";
}

async function askAi() {
  const button = $("#ai-help");
  button.disabled = true;
  button.textContent = "AI가 대화를 정리하는 중…";
  try {
    await api("/api/ai/suggest", { method: "POST" });
    showToast("AI가 다음 행동 초안을 만들었습니다.");
  } catch (error) { showToast(error.message); }
  finally {
    button.disabled = false;
    button.innerHTML = '<span aria-hidden="true">✦</span> AI에게 다음 단계 묻기';
  }
}

async function loadTeacherOverview() {
  const data = await api(`/api/teacher/overview/${encodeURIComponent(state.teacherActivityCode)}`, {
    headers: { "X-Teacher-Code": state.teacherCode },
  });
  state.teacherData = data;
  renderTeacher();
}

function renderTeacher() {
  const { activity, groups } = state.teacherData;
  $("#teacher-topic").textContent = activity.topic;
  $("#teacher-class").textContent = activity.className;
  $("#teacher-topic-input").value = activity.topic;
  $("#teacher-objective-input").value = activity.objective;
  startTeacherTimer(activity.endsAt);
  const tabs = $("#group-tabs");
  tabs.textContent = "";
  groups.forEach((group) => {
    const button = document.createElement("button");
    button.textContent = `${group.groupNo}모둠 · ${group.members.length}명`;
    button.classList.toggle("is-active", group.groupNo === state.selectedGroup);
    button.addEventListener("click", () => { state.selectedGroup = group.groupNo; renderTeacher(); });
    tabs.append(button);
  });
  const group = groups.find((entry) => entry.groupNo === state.selectedGroup);
  renderTeacherGroup(group);
}

function startTeacherTimer(endsAt) {
  const element = $("#teacher-timer");
  const remaining = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  element.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  element.classList.toggle("is-over", remaining === 0);
}

function renderTeacherGroup(group) {
  const detail = $("#teacher-group-detail");
  detail.textContent = "";
  const chatColumn = document.createElement("article");
  chatColumn.className = "teacher-column";
  const chatTitle = document.createElement("h2");
  chatTitle.textContent = `${group.groupNo}모둠 실시간 대화`;
  const messages = document.createElement("div");
  messages.className = "teacher-messages";
  if (!group.messages.length) messages.textContent = "아직 대화가 없습니다.";
  group.messages.forEach((message) => {
    const entry = document.createElement("div");
    entry.className = "teacher-message";
    const name = document.createElement("strong");
    name.textContent = `${message.sender} · ${message.role}`;
    const time = document.createElement("time");
    time.textContent = formatTime(message.createdAt);
    const text = document.createElement("div");
    text.textContent = message.content;
    entry.append(name, time, text);
    messages.append(entry);
  });
  chatColumn.append(chatTitle, messages);
  const workColumn = document.createElement("article");
  workColumn.className = "teacher-column";
  const workTitle = document.createElement("h2");
  workTitle.textContent = "역할과 작업 기록";
  const workList = document.createElement("div");
  workList.className = "teacher-work-list";
  if (!group.workItems.length) workList.textContent = "확인된 작업 기록이 없습니다.";
  group.workItems.forEach((item) => {
    const entry = document.createElement("div");
    entry.className = "teacher-work-entry";
    const title = document.createElement("strong");
    title.textContent = `${item.studentName} · ${item.role} · ${item.status}`;
    const task = document.createElement("div");
    task.textContent = item.task;
    entry.append(title, task);
    workList.append(entry);
  });
  const feedbackEditor = document.createElement("section");
  feedbackEditor.className = "feedback-editor";
  const feedbackTitle = document.createElement("h3");
  feedbackTitle.textContent = "과정 중심 피드백";
  const feedbackText = document.createElement("textarea");
  feedbackText.setAttribute("aria-label", "과정 중심 피드백 내용");
  feedbackText.placeholder = "AI 초안을 만든 뒤 교사가 확인하고 수정하세요.";
  feedbackText.value = state.feedbackDrafts[group.groupNo] ?? group.feedback?.content ?? "";
  feedbackText.addEventListener("input", () => { state.feedbackDrafts[group.groupNo] = feedbackText.value; });
  const feedbackActions = document.createElement("div");
  feedbackActions.className = "feedback-actions";
  const draftButton = document.createElement("button");
  draftButton.className = "draft-button";
  draftButton.textContent = "AI 초안 만들기";
  draftButton.addEventListener("click", async () => {
    draftButton.disabled = true;
    draftButton.textContent = "기록 살펴보는 중…";
    try {
      const result = await api(`/api/teacher/feedback/${encodeURIComponent(state.teacherActivityCode)}/${group.groupNo}/draft`, {
        method: "POST", headers: { "X-Teacher-Code": state.teacherCode },
      });
      state.feedbackDrafts[group.groupNo] = result.draft;
      feedbackText.value = result.draft;
      showToast("AI 초안을 만들었습니다. 내용을 확인해 주세요.");
    } catch (error) { showToast(error.message); }
    finally { draftButton.disabled = false; draftButton.textContent = "AI 초안 만들기"; }
  });
  const publishButton = document.createElement("button");
  publishButton.className = "publish-button";
  publishButton.textContent = "학생에게 공개";
  publishButton.addEventListener("click", async () => {
    const content = feedbackText.value.trim();
    if (content.length < 10) { showToast("피드백 내용을 먼저 확인해 주세요."); return; }
    try {
      await api(`/api/teacher/feedback/${encodeURIComponent(state.teacherActivityCode)}/${group.groupNo}/publish`, {
        method: "POST", headers: { "X-Teacher-Code": state.teacherCode }, json: { content },
      });
      state.feedbackDrafts[group.groupNo] = content;
      showToast("교사가 확인한 피드백을 학생에게 공개했습니다.");
      await loadTeacherOverview();
    } catch (error) { showToast(error.message); }
  });
  feedbackActions.append(draftButton, publishButton);
  feedbackEditor.append(feedbackTitle, feedbackText, feedbackActions);
  workColumn.append(workTitle, workList, feedbackEditor);
  detail.append(chatColumn, workColumn);
  messages.scrollTop = messages.scrollHeight;
}

function logoutStudent() {
  localStorage.removeItem("science-room-token");
  state.token = "";
  if (state.socket) state.socket.close();
  location.reload();
}

function logoutTeacher() {
  sessionStorage.removeItem("teacher-code");
  sessionStorage.removeItem("teacher-activity");
  clearInterval(state.teacherPoll);
  location.reload();
}

$("#student-tab").addEventListener("click", () => switchLoginMode("student"));
$("#teacher-tab").addEventListener("click", () => switchLoginMode("teacher"));

$("#student-login").addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = $("#login-error");
  error.hidden = true;
  const form = new FormData(event.currentTarget);
  try {
    const data = await api("/api/login", {
      method: "POST",
      json: {
        activity_code: form.get("activityCode"),
        class_name: form.get("className"),
        name: form.get("name"),
        group_no: Number(form.get("groupNo")),
      },
    });
    state.token = data.token;
    localStorage.setItem("science-room-token", state.token);
    await enterStudentRoom();
  } catch (exception) {
    error.textContent = exception.message;
    error.hidden = false;
  }
});

$("#teacher-login").addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = $("#login-error");
  error.hidden = true;
  const form = new FormData(event.currentTarget);
  state.teacherActivityCode = String(form.get("activityCode")).trim().toUpperCase();
  state.teacherCode = String(form.get("teacherCode"));
  try {
    await loadTeacherOverview();
    sessionStorage.setItem("teacher-code", state.teacherCode);
    sessionStorage.setItem("teacher-activity", state.teacherActivityCode);
    showView("teacher");
    state.teacherPoll = setInterval(() => loadTeacherOverview().catch(() => {}), 2000);
  } catch (exception) {
    error.textContent = exception.message;
    error.hidden = false;
  }
});

$("#message-form").addEventListener("submit", sendMessage);
$("#file-input").addEventListener("change", (event) => handleFile(event.target.files[0]));
$("#ai-help").addEventListener("click", askAi);
$("#student-logout").addEventListener("click", logoutStudent);
$("#teacher-logout").addEventListener("click", logoutTeacher);
$("#message-input").addEventListener("input", (event) => {
  event.target.style.height = "auto";
  event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
});

$("#activity-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const activity = await api(`/api/teacher/activity/${encodeURIComponent(state.teacherActivityCode)}`, {
      method: "PUT",
      headers: { "X-Teacher-Code": state.teacherCode },
      json: {
        topic: $("#teacher-topic-input").value,
        objective: $("#teacher-objective-input").value,
        steps: state.teacherData.activity.steps,
        minutes: Number($("#teacher-minutes").value),
      },
    });
    state.teacherData.activity = activity;
    renderTeacher();
    showToast("새 활동 시간이 시작되었습니다.");
  } catch (error) { showToast(error.message); }
});

$$('.mobile-panel-switch button').forEach((button) => {
  button.addEventListener("click", () => {
    $$('.mobile-panel-switch button').forEach((item) => item.classList.toggle("is-active", item === button));
    $$('.three-panel-layout .panel').forEach((panel) => panel.classList.remove("is-mobile-active"));
    $(`#${button.dataset.panel}-panel`).classList.add("is-mobile-active");
  });
});

async function initialize() {
  if (state.token) {
    try { await enterStudentRoom(); return; }
    catch (_) { localStorage.removeItem("science-room-token"); state.token = ""; }
  }
  if (state.teacherCode && state.teacherActivityCode) {
    try {
      await loadTeacherOverview();
      showView("teacher");
      state.teacherPoll = setInterval(() => loadTeacherOverview().catch(() => {}), 2000);
      return;
    } catch (_) {
      sessionStorage.clear();
      state.teacherCode = "";
    }
  }
  showView("login");
}

initialize();
