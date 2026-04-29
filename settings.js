const TEMPLATE_KEY = "weekly-todo-template-v01";
const STORAGE_KEY = "weekly-todo-v01";
const BACKUP_KEYS = [
  "weekly-todo-v01",
  "weekly-todo-template-v01",
  "weekly-todo-long-memos-v01",
  "weekly-todo-long-memo-history-v01",
  "weekly-todo-shopping-list-v01",
  "weekly-todo-short-tasks-v01",
  "weekly-todo-template-updated-at",
];

const DAYS = [
  { key: "mon", label: "\u6708\u66dc\u65e5" },
  { key: "tue", label: "\u706b\u66dc\u65e5" },
  { key: "wed", label: "\u6c34\u66dc\u65e5" },
  { key: "thu", label: "\u6728\u66dc\u65e5" },
  { key: "fri", label: "\u91d1\u66dc\u65e5" },
  { key: "sat", label: "\u571f\u66dc\u65e5" },
  { key: "sun", label: "\u65e5\u66dc\u65e5" },
];

const settingsList = document.querySelector("#settingsList");
const settingsDayTemplate = document.querySelector("#settingsDayTemplate");
const exportBackupButton = document.querySelector("#exportBackupButton");
const importBackupButton = document.querySelector("#importBackupButton");
const importBackupInput = document.querySelector("#importBackupInput");
const manualResetButton = document.querySelector("#manualResetButton");

let template = loadTemplate();
render();

exportBackupButton.addEventListener("click", exportBackup);
importBackupButton.addEventListener("click", () => {
  importBackupInput.click();
});
importBackupInput.addEventListener("change", importBackup);
manualResetButton.addEventListener("click", resetWeeklyTasks);

function render() {
  settingsList.innerHTML = "";

  DAYS.forEach((day) => {
    const panel = settingsDayTemplate.content.firstElementChild.cloneNode(true);
    const title = panel.querySelector("h2");
    const count = panel.querySelector(".day-count");
    const form = panel.querySelector(".add-form");
    const input = panel.querySelector("input");
    const list = panel.querySelector(".task-list");
    const tasks = template[day.key] ?? [];

    title.textContent = day.label;
    count.textContent = tasks.length === 0 ? "\u57fa\u672c\u30bf\u30b9\u30af\u306a\u3057" : `\u57fa\u672c\u30bf\u30b9\u30af ${tasks.length}\u4ef6`;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const titleText = input.value.trim();
      if (!titleText) return;

      template[day.key].push(titleText);
      input.value = "";
      saveTemplate();
      render();
    });

    if (tasks.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "\u30bf\u30b9\u30af\u306f\u3042\u308a\u307e\u305b\u3093";
      list.append(empty);
    } else {
      tasks.forEach((taskTitle, index) => {
        list.append(createTemplateTask(day.key, taskTitle, index));
      });
    }

    settingsList.append(panel);
  });
}

function createTemplateTask(dayKey, taskTitle, index) {
  const item = document.createElement("li");
  item.className = "task-item template-task";

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = taskTitle;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "\u00d7";
  deleteButton.setAttribute("aria-label", `${taskTitle}\u3092\u524a\u9664`);
  deleteButton.addEventListener("click", () => {
    template[dayKey].splice(index, 1);
    saveTemplate();
    render();
  });

  item.append(title, deleteButton);
  return item;
}

function loadTemplate() {
  const fallback = createEmptyTemplate();

  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    const normalized = createEmptyTemplate();
    DAYS.forEach((day) => {
      const tasks = Array.isArray(parsed?.[day.key]) ? parsed[day.key] : [];
      normalized[day.key] = tasks.filter((title) => typeof title === "string" && title.trim()).map((title) => title.trim());
    });
    return normalized;
  } catch {
    return fallback;
  }
}

function saveTemplate() {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(template));
  localStorage.setItem("weekly-todo-template-updated-at", new Date().toISOString());
}

function exportBackup() {
  const backup = {
    app: "weekly-todo",
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    data: Object.fromEntries(BACKUP_KEYS.map((key) => [key, localStorage.getItem(key)])),
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `weekly-todo-backup-${toLocalDateString(new Date())}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importBackup(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const data = getBackupData(parsed);
      validateBackupData(data);

      const ok = window.confirm("\u73fe\u5728\u306e\u30c7\u30fc\u30bf\u3092\u4e0a\u66f8\u304d\u3057\u307e\u3059\u3002\u3088\u308d\u3057\u3044\u3067\u3059\u304b\uff1f");
      if (!ok) return;

      restoreBackupData(data);
      window.location.reload();
    } catch {
      window.alert("\u30d0\u30c3\u30af\u30a2\u30c3\u30d7\u30d5\u30a1\u30a4\u30eb\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3002");
    }
  });
  reader.addEventListener("error", () => {
    window.alert("\u30d0\u30c3\u30af\u30a2\u30c3\u30d7\u30d5\u30a1\u30a4\u30eb\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3002");
  });
  reader.readAsText(file);
}

function getBackupData(parsed) {
  if (parsed && typeof parsed === "object" && parsed.data && typeof parsed.data === "object") {
    return parsed.data;
  }

  if (parsed && typeof parsed === "object") return parsed;
  throw new Error("Invalid backup");
}

function validateBackupData(data) {
  const hasTargetKey = BACKUP_KEYS.some((key) => Object.prototype.hasOwnProperty.call(data, key));
  if (!hasTargetKey) throw new Error("No target keys");

  BACKUP_KEYS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key)) return;

    const value = data[key];
    if (value !== null && typeof value !== "string") {
      throw new Error("Invalid value");
    }
  });
}

function restoreBackupData(data) {
  BACKUP_KEYS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(data, key)) return;

    const value = data[key];
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  });
}

function resetWeeklyTasks() {
  const ok = window.confirm("\u4eca\u9031\u306e\u30bf\u30b9\u30af\u3092\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u306b\u623b\u3057\u307e\u3059\u304b\uff1f");
  if (!ok) return;

  const tasks = Object.fromEntries(
    DAYS.map((day) => [
      day.key,
      (template[day.key] ?? []).map((title) => ({
        id: createId(),
        title,
        done: false,
      })),
    ])
  );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      lastOpenedDate: toLocalDateString(new Date()),
      tasks,
    })
  );
  window.alert("\u4eca\u9031\u306e\u30bf\u30b9\u30af\u3092\u30c6\u30f3\u30d7\u30ec\u30fc\u30c8\u306b\u623b\u3057\u307e\u3057\u305f\u3002");
}

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyTemplate() {
  return Object.fromEntries(DAYS.map((day) => [day.key, []]));
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
