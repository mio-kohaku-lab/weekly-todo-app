const LONG_MEMO_HISTORY_KEY = "weekly-todo-long-memo-history-v01";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

const historyList = document.querySelector("#historyList");
const clearHistoryButton = document.querySelector("#clearHistoryButton");

let historyItems = loadHistory();
renderHistory();

clearHistoryButton.addEventListener("click", () => {
  if (historyItems.length === 0) return;

  const ok = window.confirm("\u5c65\u6b74\u3092\u3059\u3079\u3066\u524a\u9664\u3057\u307e\u3059\u304b\uff1f\u3053\u306e\u64cd\u4f5c\u306f\u5143\u306b\u623b\u305b\u307e\u305b\u3093\u3002");
  if (!ok) return;

  historyItems = [];
  saveHistory();
  renderHistory();
});

function renderHistory() {
  historyList.innerHTML = "";
  clearHistoryButton.disabled = historyItems.length === 0;

  if (historyItems.length === 0) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "\u5c65\u6b74\u306f\u3042\u308a\u307e\u305b\u3093";
    historyList.append(empty);
    return;
  }

  getSortedHistory(historyItems).forEach((item) => {
    historyList.append(createHistoryElement(item));
  });
}

function createHistoryElement(item) {
  const element = document.createElement("li");
  element.className = "history-item";
  element.textContent = item.title;
  element.tabIndex = 0;
  element.setAttribute("aria-label", item.title);

  let pressTimer = null;
  let pointerStart = null;
  let longPressHandled = false;

  element.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
    longPressHandled = false;
    pressTimer = window.setTimeout(() => {
      pressTimer = null;
      longPressHandled = true;
      confirmDeleteHistoryItem(item.id);
    }, 650);
  });

  element.addEventListener("pointermove", (event) => {
    if (!pointerStart || !pressTimer) return;

    const movedX = Math.abs(event.clientX - pointerStart.x);
    const movedY = Math.abs(event.clientY - pointerStart.y);
    if (movedX > 8 || movedY > 8) clearHistoryPress();
  });

  element.addEventListener("pointerup", clearHistoryPress);
  element.addEventListener("pointercancel", clearHistoryPress);
  element.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    clearHistoryPress();
    if (longPressHandled) return;

    confirmDeleteHistoryItem(item.id);
  });

  function clearHistoryPress() {
    if (pressTimer) window.clearTimeout(pressTimer);
    pressTimer = null;
    pointerStart = null;
  }

  return element;
}

function confirmDeleteHistoryItem(id) {
  const ok = window.confirm("\u3053\u306e\u5c65\u6b74\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f");
  if (!ok) return;

  historyItems = historyItems.filter((item) => item.id !== id);
  saveHistory();
  renderHistory();
}

function getSortedHistory(items) {
  return [...items].sort((a, b) => {
    const dateDiff = getSortTime(a.sortDate) - getSortTime(b.sortDate);
    if (dateDiff !== 0) return dateDiff;
    return a.order - b.order;
  });
}

function getSortTime(sortDate) {
  const date = parseLocalDate(sortDate);
  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(LONG_MEMO_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => typeof item?.title === "string" && item.title.trim() && typeof item?.sortDate === "string")
      .map((item, index) => ({
        id: typeof item.id === "string" ? item.id : createId(),
        title: item.title.trim(),
        sortDate: item.sortDate,
        order: index,
      }));
  } catch {
    return [];
  }
}

function saveHistory() {
  const data = historyItems.map((item) => ({
    id: item.id,
    title: item.title,
    sortDate: item.sortDate,
  }));
  localStorage.setItem(LONG_MEMO_HISTORY_KEY, JSON.stringify(data));
}

function parseLocalDate(dateString) {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return date;
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
