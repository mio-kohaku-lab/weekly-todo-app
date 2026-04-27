const STORAGE_KEY = "weekly-todo-v01";
const TEMPLATE_KEY = "weekly-todo-template-v01";
const LONG_MEMO_KEY = "weekly-todo-long-memos-v01";
const LONG_MEMO_HISTORY_KEY = "weekly-todo-long-memo-history-v01";

const DAYS = [
  { key: "mon", label: "\u6708\u66dc\u65e5" },
  { key: "tue", label: "\u706b\u66dc\u65e5" },
  { key: "wed", label: "\u6c34\u66dc\u65e5" },
  { key: "thu", label: "\u6728\u66dc\u65e5" },
  { key: "fri", label: "\u91d1\u66dc\u65e5" },
  { key: "sat", label: "\u571f\u66dc\u65e5" },
  { key: "sun", label: "\u65e5\u66dc\u65e5" },
];

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

const dayStrip = document.querySelector("#dayStrip");
const dayTemplate = document.querySelector("#dayTemplate");
const manualResetButton = document.querySelector("#manualResetButton");
const longMemoList = document.querySelector("#longMemoList");
const longMemoAddButton = document.querySelector("#longMemoAddButton");

let state = loadState();
let longMemos = loadLongMemos();
state = applyDateRollover(state, new Date());
saveState();
render();
scrollTodayIntoView();

manualResetButton.addEventListener("click", () => {
  const ok = window.confirm("\u4eca\u9031\u306e\u30bf\u30b9\u30af\u3092\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u306b\u623b\u3057\u307e\u3059\u304b\uff1f");
  if (!ok) return;

  state = createInitialState(new Date());
  saveState();
  render();
  scrollTodayIntoView();
});

longMemoAddButton.addEventListener("click", () => {
  const text = window.prompt("\u9577\u671f\u30e1\u30e2\u3092\u8ffd\u52a0");
  const title = text?.trim();
  if (!title) return;

  longMemos.push({
    id: createId(),
    title,
  });
  saveLongMemos();
  renderLongMemos();
});

function render() {
  dayStrip.innerHTML = "";
  const todayIndex = getTodayIndex(new Date());

  DAYS.forEach((day, index) => {
    const card = dayTemplate.content.firstElementChild.cloneNode(true);
    const title = card.querySelector("h2");
    const list = card.querySelector(".task-list");
    const tasks = state.tasks[day.key] ?? [];

    card.dataset.dayIndex = String(index);
    card.classList.toggle("is-today", index === todayIndex);
    title.textContent = day.label;

    if (tasks.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "\u30bf\u30b9\u30af\u306f\u3042\u308a\u307e\u305b\u3093";
      list.append(empty);
    } else {
      getDisplayTasks(tasks).forEach((task) => {
        list.append(createTaskElement(task, index));
      });
    }

    dayStrip.append(card);
  });

  renderLongMemos();
}

function getDisplayTasks(tasks) {
  const activeTasks = tasks.filter((task) => !task.done);
  const doneTasks = tasks.filter((task) => task.done);
  return [...activeTasks, ...doneTasks];
}

function createTaskElement(task, dayIndex) {
  const item = document.createElement("li");
  item.className = "task-item check-task";
  item.classList.toggle("is-done", task.done);
  item.tabIndex = 0;
  item.setAttribute("role", "checkbox");
  item.setAttribute("aria-checked", String(task.done));
  item.setAttribute("aria-label", `${task.title}\u306e\u5b8c\u4e86\u3092\u5207\u308a\u66ff\u3048`);

  const checkbox = document.createElement("input");
  checkbox.className = "task-check";
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.tabIndex = -1;
  checkbox.setAttribute("aria-label", `${task.title}\u306e\u5b8c\u4e86\u3092\u5207\u308a\u66ff\u3048`);
  checkbox.addEventListener("change", () => {
    setTaskDone(task, checkbox.checked, dayIndex);
  });

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;

  let pointerStart = null;
  item.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  });

  item.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;

    const movedX = Math.abs(event.clientX - pointerStart.x);
    const movedY = Math.abs(event.clientY - pointerStart.y);
    pointerStart = null;

    if (movedX > 8 || movedY > 8) return;
    setTaskDone(task, !task.done, dayIndex);
  });

  item.addEventListener("pointercancel", () => {
    pointerStart = null;
  });

  item.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Enter") return;

    event.preventDefault();
    setTaskDone(task, !task.done, dayIndex);
  });

  item.append(checkbox, title);
  return item;
}

function setTaskDone(task, done, dayIndex) {
  task.done = done;
  saveState();
  render();
  scrollCardIntoView(dayIndex, "auto");
}

function renderLongMemos() {
  longMemoList.innerHTML = "";

  if (longMemos.length === 0) {
    const empty = document.createElement("li");
    empty.className = "long-memo-empty";
    empty.textContent = "\u9577\u671f\u30e1\u30e2\u306f\u3042\u308a\u307e\u305b\u3093";
    longMemoList.append(empty);
    return;
  }

  const { datedMemos, undatedMemos } = groupLongMemos(longMemos);

  datedMemos.forEach((memo) => {
    longMemoList.append(createLongMemoElement(memo));
  });

  if (undatedMemos.length > 0) {
    const undatedGroup = document.createElement("li");
    undatedGroup.className = "long-memo-undated-group";

    const undatedList = document.createElement("ul");
    undatedList.className = "long-memo-sublist";

    undatedMemos.forEach((memo) => {
      undatedList.append(createLongMemoElement(memo));
    });

    undatedGroup.append(undatedList);
    longMemoList.append(undatedGroup);
  }
}

function groupLongMemos(memos) {
  const today = new Date();
  const todayStart = getDateStart(today);
  const datedMemos = [];
  const undatedMemos = [];

  memos.forEach((memo, index) => {
    const date = parseMemoDate(memo.title, today);
    const memoWithMeta = {
      ...memo,
      isDueSoon: date ? isDateDueSoon(date, todayStart) : false,
      sortTime: date?.getTime() ?? 0,
      sortIndex: index,
    };

    if (date) {
      datedMemos.push(memoWithMeta);
    } else {
      undatedMemos.push(memoWithMeta);
    }
  });

  datedMemos.sort((a, b) => {
    if (a.sortTime !== b.sortTime) return a.sortTime - b.sortTime;
    return a.sortIndex - b.sortIndex;
  });

  return { datedMemos, undatedMemos };
}

function parseMemoDate(title, today) {
  const match = title.match(/^\s*(?:(\d{4})\u5e74)?(\d{1,2})\u6708(\d{1,2})\u65e5/);
  if (!match) return null;

  const explicitYear = match[1] ? Number(match[1]) : null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const year = explicitYear ?? today.getFullYear();
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  if (explicitYear) return date;

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (date < todayStart) {
    return new Date(year + 1, month - 1, day);
  }

  return date;
}

function isDateDueSoon(date, todayStart) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((getDateStart(date) - todayStart) / msPerDay);
  return diffDays <= 2;
}

function getDateStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function createLongMemoElement(memo) {
  const item = document.createElement("li");
  item.className = "long-memo-item";
  item.classList.toggle("is-due-soon", Boolean(memo.isDueSoon));
  item.textContent = memo.title;
  item.tabIndex = 0;
  item.setAttribute("aria-label", memo.title);

  let pressTimer = null;
  let pointerStart = null;
  let longPressHandled = false;

  item.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
    longPressHandled = false;
    pressTimer = window.setTimeout(() => {
      pressTimer = null;
      longPressHandled = true;
      confirmDeleteLongMemo(memo.id);
    }, 650);
  });

  item.addEventListener("pointermove", (event) => {
    if (!pointerStart || !pressTimer) return;

    const movedX = Math.abs(event.clientX - pointerStart.x);
    const movedY = Math.abs(event.clientY - pointerStart.y);
    if (movedX > 8 || movedY > 8) clearLongMemoPress();
  });

  item.addEventListener("pointerup", clearLongMemoPress);
  item.addEventListener("pointercancel", clearLongMemoPress);
  item.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    clearLongMemoPress();
    if (longPressHandled) return;

    confirmDeleteLongMemo(memo.id);
  });

  function clearLongMemoPress() {
    if (pressTimer) window.clearTimeout(pressTimer);
    pressTimer = null;
    pointerStart = null;
  }

  return item;
}

function confirmDeleteLongMemo(id) {
  const ok = window.confirm("\u3053\u306e\u30e1\u30e2\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f");
  if (!ok) return;

  const memo = longMemos.find((item) => item.id === id);
  const memoDate = memo ? parseMemoDate(memo.title, new Date()) : null;
  if (memo && memoDate) {
    saveLongMemoHistory(memo.title, memoDate);
  }

  longMemos = longMemos.filter((memo) => memo.id !== id);
  saveLongMemos();
  renderLongMemos();
}

function applyDateRollover(currentState, now) {
  const today = toLocalDateString(now);
  const lastOpenedDate = currentState.lastOpenedDate;

  if (!lastOpenedDate || lastOpenedDate === today) {
    return { ...currentState, lastOpenedDate: today };
  }

  if (getWeekStart(lastOpenedDate) !== getWeekStart(today)) {
    return createInitialState(now);
  }

  const diff = daysBetween(lastOpenedDate, today);
  if (diff <= 0) {
    return { ...currentState, lastOpenedDate: today };
  }

  return {
    ...currentState,
    lastOpenedDate: today,
    tasks: moveActiveTasks(currentState.tasks, diff),
  };
}

function moveActiveTasks(tasksByDay, diff) {
  const nextTasks = createEmptyTasks();

  DAYS.forEach((day, index) => {
    const tasks = tasksByDay[day.key] ?? [];

    tasks.forEach((task) => {
      if (task.done) {
        nextTasks[day.key].push(task);
        return;
      }

      const destinationIndex = Math.min(index + diff, DAYS.length - 1);
      nextTasks[DAYS[destinationIndex].key].push(task);
    });
  });

  return nextTasks;
}

function loadState() {
  const fallback = createInitialState(new Date());

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    return normalizeState(parsed, fallback);
  } catch {
    return fallback;
  }
}

function loadLongMemos() {
  try {
    const raw = localStorage.getItem(LONG_MEMO_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((memo) => typeof memo?.title === "string" && memo.title.trim())
      .map((memo) => ({
        id: typeof memo.id === "string" ? memo.id : createId(),
        title: memo.title.trim(),
      }));
  } catch {
    return [];
  }
}

function loadLongMemoHistory() {
  try {
    const raw = localStorage.getItem(LONG_MEMO_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => typeof item?.title === "string" && item.title.trim() && typeof item?.sortDate === "string")
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : createId(),
        title: item.title.trim(),
        sortDate: item.sortDate,
      }));
  } catch {
    return [];
  }
}

function normalizeState(parsed, fallback) {
  const normalizedTasks = createEmptyTasks();

  DAYS.forEach((day) => {
    const tasks = Array.isArray(parsed?.tasks?.[day.key]) ? parsed.tasks[day.key] : [];
    normalizedTasks[day.key] = tasks
      .filter((task) => typeof task?.title === "string" && task.title.trim())
      .map((task) => ({
        id: typeof task.id === "string" ? task.id : createId(),
        title: task.title.trim(),
        done: Boolean(task.done),
      }));
  });

  return {
    ...fallback,
    ...parsed,
    tasks: normalizedTasks,
    lastOpenedDate: typeof parsed?.lastOpenedDate === "string" ? parsed.lastOpenedDate : fallback.lastOpenedDate,
  };
}

function createInitialState(date) {
  return {
    version: 2,
    lastOpenedDate: toLocalDateString(date),
    tasks: createTasksFromTemplate(),
  };
}

function createTasksFromTemplate() {
  const template = loadTemplate();
  const tasks = createEmptyTasks();

  DAYS.forEach((day) => {
    tasks[day.key] = template[day.key].map((title) => createTask(title));
  });

  return tasks;
}

function loadTemplate() {
  const fallback = createEmptyTasks();

  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    const template = createEmptyTasks();
    DAYS.forEach((day) => {
      const tasks = Array.isArray(parsed?.[day.key]) ? parsed[day.key] : [];
      template[day.key] = tasks.filter((title) => typeof title === "string" && title.trim()).map((title) => title.trim());
    });
    return template;
  } catch {
    return fallback;
  }
}

function createEmptyTasks() {
  return Object.fromEntries(DAYS.map((day) => [day.key, []]));
}

function createTask(title) {
  return {
    id: createId(),
    title,
    done: false,
  };
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveLongMemos() {
  localStorage.setItem(LONG_MEMO_KEY, JSON.stringify(longMemos));
}

function saveLongMemoHistory(title, date) {
  const history = loadLongMemoHistory();
  history.push({
    id: createId(),
    title,
    sortDate: toLocalDateString(date),
  });
  localStorage.setItem(LONG_MEMO_HISTORY_KEY, JSON.stringify(history));
}

function scrollTodayIntoView() {
  requestAnimationFrame(() => {
    scrollCardIntoView(getTodayIndex(new Date()), "auto");
  });
}

function scrollCardIntoView(index, behavior) {
  const card = dayStrip.querySelector(`[data-day-index="${index}"]`);
  card?.scrollIntoView({ behavior, inline: "center", block: "nearest" });
}

function getTodayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStart(dateString) {
  const date = parseLocalDate(dateString);
  const mondayBasedDay = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayBasedDay);
  return toLocalDateString(date);
}

function daysBetween(fromDateString, toDateString) {
  const from = parseLocalDate(fromDateString);
  const to = parseLocalDate(toDateString);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to - from) / msPerDay);
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}
