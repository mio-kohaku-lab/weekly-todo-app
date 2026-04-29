const SHORT_TASKS_KEY = "weekly-todo-short-tasks-v01";
const SHORT_LISTS = [
  { key: "night", label: "\u591c" },
  { key: "one", label: "1" },
  { key: "two", label: "2" },
  { key: "three", label: "3" },
];

const shortForm = document.querySelector("#shortForm");
const shortInput = document.querySelector("#shortInput");
const shortList = document.querySelector("#shortList");
const shortItemTemplate = document.querySelector("#shortItemTemplate");
const shortClearButton = document.querySelector("#shortClearButton");
const listButtons = document.querySelectorAll(".short-tab");
const shortBack = document.querySelector(".short-back");

let shortState = loadShortState();
let draggingId = null;
let longPressTimer = null;

renderShortTasks();
renderListButtons();

shortForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = shortInput.value.trim();
  if (!title) return;

  const tasks = getActiveTasks();
  tasks.unshift({
    id: createId(),
    title,
    done: false,
  });
  setActiveTasks(tasks);
  shortInput.value = "";
  saveShortState();
  renderShortTasks();
  renderListButtons();
  shortInput.focus();
});

shortClearButton.addEventListener("click", () => {
  if (getActiveTasks().length === 0) return;

  const ok = window.confirm("\u77ed\u671fToDo\u306e\u5168\u30bf\u30b9\u30af\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f\u3053\u306e\u64cd\u4f5c\u306f\u5143\u306b\u623b\u305b\u307e\u305b\u3093\u3002");
  if (!ok) return;

  setActiveTasks([]);
  saveShortState();
  renderShortTasks();
  renderListButtons();
});

listButtons.forEach((button) => {
  const listKey = button.dataset.list;
  button.addEventListener("click", () => {
    if (!isValidListKey(listKey) || listKey === shortState.activeListId) return;

    shortState.activeListId = listKey;
    draggingId = null;
    saveShortState();
    renderShortTasks();
    renderListButtons();
  });
});

shortBack.addEventListener("click", (event) => {
  event.preventDefault();
  navigateWithFlip(shortBack.href);
});

function renderShortTasks() {
  shortList.innerHTML = "";
  const tasks = getActiveTasks();

  if (tasks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "short-empty";
    empty.textContent = "\u77ed\u671fToDo\u306f\u7a7a\u3067\u3059";
    shortList.append(empty);
    return;
  }

  tasks.forEach((task) => {
    shortList.append(createShortTaskElement(task));
  });
}

function createShortTaskElement(task) {
  const item = shortItemTemplate.content.firstElementChild.cloneNode(true);
  const handle = item.querySelector(".short-handle");
  const checkbox = item.querySelector(".short-check");
  const title = item.querySelector(".short-title");

  item.dataset.id = task.id;
  item.classList.toggle("is-done", task.done);
  item.classList.toggle("is-dragging", task.id === draggingId);
  title.textContent = task.title;
  checkbox.checked = task.done;
  checkbox.setAttribute("aria-label", `${task.title}\u306e\u5b8c\u4e86\u3092\u5207\u308a\u66ff\u3048`);
  checkbox.addEventListener("change", () => {
    setShortTaskDone(task.id, checkbox.checked);
  });

  handle.addEventListener("pointerdown", (event) => {
    startDragging(event, task.id, item, handle);
  });

  item.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".short-handle") || event.target.closest(".short-check")) return;
    startTaskDeletePress(task.id);
  });
  item.addEventListener("pointerup", clearLongPressTimer);
  item.addEventListener("pointerleave", clearLongPressTimer);
  item.addEventListener("pointercancel", clearLongPressTimer);
  item.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    confirmDeleteTask(task.id);
  });

  return item;
}

function setShortTaskDone(id, done) {
  const tasks = getActiveTasks();
  const index = tasks.findIndex((task) => task.id === id);
  if (index < 0) return;

  const [task] = tasks.splice(index, 1);
  task.done = done;

  const firstDoneIndex = tasks.findIndex((item) => item.done);
  if (done || firstDoneIndex >= 0) {
    const insertIndex = firstDoneIndex < 0 ? tasks.length : firstDoneIndex;
    tasks.splice(insertIndex, 0, task);
  } else {
    tasks.push(task);
  }

  setActiveTasks(tasks);
  saveShortState();
  renderShortTasks();
  renderListButtons();
}

function startTaskDeletePress(id) {
  clearLongPressTimer();
  longPressTimer = window.setTimeout(() => {
    confirmDeleteTask(id);
  }, 700);
}

function confirmDeleteTask(id) {
  const ok = window.confirm("\u3053\u306e\u77ed\u671fToDo\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f");
  if (!ok) return;

  setActiveTasks(getActiveTasks().filter((task) => task.id !== id));
  saveShortState();
  renderShortTasks();
  renderListButtons();
}

function renderListButtons() {
  listButtons.forEach((button) => {
    const key = button.dataset.list;
    button.classList.toggle("has-tasks", getTasksForList(key).length > 0);
    button.classList.toggle("is-active", key === shortState.activeListId);
  });
}

function startDragging(event, id, element, handle) {
  draggingId = id;
  element.classList.add("is-dragging");
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function moveDraggingItem(event) {
  if (!draggingId) return;

  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".short-item");
  if (!target || !shortList.contains(target)) return;

  const targetId = target.dataset.id;
  if (!targetId || targetId === draggingId) return;

  const tasks = getActiveTasks();
  const fromIndex = tasks.findIndex((task) => task.id === draggingId);
  const toIndex = tasks.findIndex((task) => task.id === targetId);
  if (fromIndex < 0 || toIndex < 0) return;

  const [movedTask] = tasks.splice(fromIndex, 1);
  tasks.splice(toIndex, 0, movedTask);
  setActiveTasks(tasks);
  renderShortTasks();
}

function endDragging() {
  if (!draggingId) return;

  draggingId = null;
  saveShortState();
  renderShortTasks();
  renderListButtons();
}

window.addEventListener("pointermove", moveDraggingItem);
window.addEventListener("pointerup", endDragging);
window.addEventListener("pointercancel", endDragging);

function loadShortState() {
  const fallback = createEmptyShortState("night");

  try {
    const raw = localStorage.getItem(SHORT_TASKS_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      fallback.lists.night.tasks = normalizeShortTaskOrder(normalizeTasks(parsed));
      return fallback;
    }

    if (!parsed || typeof parsed !== "object") return fallback;

    const activeListId = isValidListKey(parsed.activeListId) ? parsed.activeListId : "night";
    const state = createEmptyShortState(activeListId);
    SHORT_LISTS.forEach((list) => {
      const rawTasks = parsed.lists?.[list.key]?.tasks;
      state.lists[list.key].tasks = normalizeShortTaskOrder(normalizeTasks(rawTasks));
    });
    return state;
  } catch {
    return fallback;
  }
}

function createEmptyShortState(activeListId) {
  return {
    activeListId,
    lists: Object.fromEntries(
      SHORT_LISTS.map((list) => [
        list.key,
        {
          label: list.label,
          tasks: [],
        },
      ])
    ),
  };
}

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return [];

  return tasks
    .filter((task) => task && typeof task.title === "string" && task.title.trim())
    .map((task) => ({
      id: typeof task.id === "string" ? task.id : createId(),
      title: task.title.trim(),
      done: Boolean(task.done),
    }));
}

function normalizeShortTaskOrder(tasks) {
  return [...tasks.filter((task) => !task.done), ...tasks.filter((task) => task.done)];
}

function getActiveTasks() {
  return getTasksForList(shortState.activeListId);
}

function getTasksForList(key) {
  return isValidListKey(key) ? shortState.lists[key].tasks : [];
}

function setActiveTasks(tasks) {
  shortState.lists[shortState.activeListId].tasks = normalizeShortTaskOrder(tasks);
}

function saveShortState() {
  localStorage.setItem(SHORT_TASKS_KEY, JSON.stringify(shortState));
}

function isValidListKey(key) {
  return SHORT_LISTS.some((list) => list.key === key);
}

function clearLongPressTimer() {
  if (!longPressTimer) return;

  window.clearTimeout(longPressTimer);
  longPressTimer = null;
}

function navigateWithFlip(url) {
  document.body.classList.remove("page-flip-in");
  document.body.classList.add("page-flip-out");
  sessionStorage.setItem("weekly-todo-flip-in", "index");
  window.setTimeout(() => {
    window.location.href = url;
  }, 170);
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
