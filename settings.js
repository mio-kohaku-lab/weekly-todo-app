const TEMPLATE_KEY = "weekly-todo-template-v01";

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

let template = loadTemplate();
render();

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

function createEmptyTemplate() {
  return Object.fromEntries(DAYS.map((day) => [day.key, []]));
}
