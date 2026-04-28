const SHOPPING_KEY = "weekly-todo-shopping-list-v01";

const shoppingForm = document.querySelector("#shoppingForm");
const shoppingInput = document.querySelector("#shoppingInput");
const shoppingList = document.querySelector("#shoppingList");
const shoppingItemTemplate = document.querySelector("#shoppingItemTemplate");

let shoppingItems = loadShoppingItems();
let draggingId = null;

renderShoppingItems();

shoppingForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = shoppingInput.value.trim();
  if (!title) return;

  shoppingItems.unshift({
    id: createId(),
    title,
  });
  shoppingInput.value = "";
  saveShoppingItems();
  renderShoppingItems();
  shoppingInput.focus();
});

function renderShoppingItems() {
  shoppingList.innerHTML = "";

  if (shoppingItems.length === 0) {
    const empty = document.createElement("p");
    empty.className = "shopping-empty";
    empty.textContent = "\u8cb7\u3044\u7269\u30ea\u30b9\u30c8\u306f\u7a7a\u3067\u3059";
    shoppingList.append(empty);
    return;
  }

  shoppingItems.forEach((item) => {
    shoppingList.append(createShoppingItemElement(item));
  });
}

function createShoppingItemElement(item) {
  const element = shoppingItemTemplate.content.firstElementChild.cloneNode(true);
  const handle = element.querySelector(".shopping-handle");
  const title = element.querySelector(".shopping-title");
  const deleteButton = element.querySelector(".shopping-delete");

  element.dataset.id = item.id;
  element.classList.toggle("is-dragging", item.id === draggingId);
  title.textContent = item.title;
  deleteButton.setAttribute("aria-label", `${item.title}\u3092\u524a\u9664`);
  deleteButton.addEventListener("click", () => {
    shoppingItems = shoppingItems.filter((shoppingItem) => shoppingItem.id !== item.id);
    saveShoppingItems();
    renderShoppingItems();
  });

  handle.addEventListener("pointerdown", (event) => {
    startDragging(event, item.id, element, handle);
  });

  return element;
}

function startDragging(event, id, element, handle) {
  draggingId = id;
  element.classList.add("is-dragging");
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function moveDraggingItem(event) {
  if (!draggingId) return;

  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".shopping-item");
  if (!target || !shoppingList.contains(target)) return;

  const targetId = target.dataset.id;
  if (!targetId || targetId === draggingId) return;

  const fromIndex = shoppingItems.findIndex((item) => item.id === draggingId);
  const toIndex = shoppingItems.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || toIndex < 0) return;

  const [movedItem] = shoppingItems.splice(fromIndex, 1);
  shoppingItems.splice(toIndex, 0, movedItem);
  renderShoppingItems();
}

function endDragging() {
  if (!draggingId) return;

  draggingId = null;
  saveShoppingItems();
  renderShoppingItems();
}

window.addEventListener("pointermove", moveDraggingItem);
window.addEventListener("pointerup", endDragging);
window.addEventListener("pointercancel", endDragging);

function loadShoppingItems() {
  try {
    const raw = localStorage.getItem(SHOPPING_KEY);
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

function saveShoppingItems() {
  localStorage.setItem(SHOPPING_KEY, JSON.stringify(shoppingItems));
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
