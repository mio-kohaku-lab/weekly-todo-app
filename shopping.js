const SHOPPING_KEY = "weekly-todo-shopping-list-v01";
const SHOPPING_STOCK_KEY = "weekly-todo-shopping-stock-list-v01";

const shoppingItemTemplate = document.querySelector("#shoppingItemTemplate");
const shoppingStockAddButton = document.querySelector("#shoppingStockAddButton");

const lists = {
  main: {
    form: document.querySelector("#shoppingForm"),
    input: document.querySelector("#shoppingInput"),
    list: document.querySelector("#shoppingList"),
    storageKey: SHOPPING_KEY,
    emptyText: "\u8cb7\u3044\u7269\u30ea\u30b9\u30c8\u306f\u7a7a\u3067\u3059",
    items: [],
  },
  stock: {
    list: document.querySelector("#shoppingStockList"),
    storageKey: SHOPPING_STOCK_KEY,
    emptyText: "",
    items: [],
  },
};

let dragging = null;

Object.entries(lists).forEach(([key, state]) => {
  state.items = loadShoppingItems(state.storageKey);
  renderShoppingItems(key);
});

lists.main.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = lists.main.input.value.trim();
  if (!title) return;

  addShoppingItem("main", title);
  lists.main.input.value = "";
  lists.main.input.focus();
});

shoppingStockAddButton.addEventListener("click", () => {
  const text = window.prompt("\u30b9\u30c8\u30c3\u30af\u5019\u88dc\u3092\u8ffd\u52a0");
  const title = text?.trim();
  if (!title) return;

  addShoppingItem("stock", title);
});

function addShoppingItem(listKey, title) {
  const state = lists[listKey];
  state.items.unshift({
    id: createId(),
    title,
  });
  saveShoppingItems(listKey);
  renderShoppingItems(listKey);
}

function renderShoppingItems(listKey) {
  const state = lists[listKey];
  state.list.innerHTML = "";

  if (state.items.length === 0) {
    if (!state.emptyText) return;

    const empty = document.createElement("p");
    empty.className = "shopping-empty";
    empty.textContent = state.emptyText;
    state.list.append(empty);
    return;
  }

  state.items.forEach((item) => {
    state.list.append(createShoppingItemElement(listKey, item));
  });
}

function createShoppingItemElement(listKey, item) {
  const element = shoppingItemTemplate.content.firstElementChild.cloneNode(true);
  const handle = element.querySelector(".shopping-handle");
  const title = element.querySelector(".shopping-title");
  const deleteButton = element.querySelector(".shopping-delete");

  element.dataset.id = item.id;
  element.dataset.listKey = listKey;
  element.classList.toggle("is-dragging", dragging?.id === item.id && dragging?.listKey === listKey);
  title.textContent = item.title;
  deleteButton.setAttribute("aria-label", `${item.title}\u3092\u524a\u9664`);
  deleteButton.addEventListener("click", () => {
    const state = lists[listKey];
    state.items = state.items.filter((shoppingItem) => shoppingItem.id !== item.id);
    saveShoppingItems(listKey);
    renderShoppingItems(listKey);
  });

  handle.addEventListener("pointerdown", (event) => {
    startDragging(event, listKey, item.id, element, handle);
  });

  return element;
}

function startDragging(event, listKey, id, element, handle) {
  dragging = { listKey, id };
  element.classList.add("is-dragging");
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function moveDraggingItem(event) {
  if (!dragging) return;

  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".shopping-item");
  if (!target || target.dataset.listKey !== dragging.listKey) return;

  const state = lists[dragging.listKey];
  if (!state.list.contains(target)) return;

  const targetId = target.dataset.id;
  if (!targetId || targetId === dragging.id) return;

  const fromIndex = state.items.findIndex((item) => item.id === dragging.id);
  const toIndex = state.items.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || toIndex < 0) return;

  const [movedItem] = state.items.splice(fromIndex, 1);
  state.items.splice(toIndex, 0, movedItem);
  renderShoppingItems(dragging.listKey);
}

function endDragging() {
  if (!dragging) return;

  const listKey = dragging.listKey;
  dragging = null;
  saveShoppingItems(listKey);
  renderShoppingItems(listKey);
}

window.addEventListener("pointermove", moveDraggingItem);
window.addEventListener("pointerup", endDragging);
window.addEventListener("pointercancel", endDragging);

function loadShoppingItems(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.title === "string" && item.title.trim())
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : createId(),
        title: item.title.trim(),
      }));
  } catch {
    return [];
  }
}

function saveShoppingItems(listKey) {
  const state = lists[listKey];
  localStorage.setItem(state.storageKey, JSON.stringify(state.items));
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
