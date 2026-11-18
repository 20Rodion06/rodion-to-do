const STORAGE_KEY = "toDoTasks";

const starterTasks = [
  { text: "Подготовить макет страницы", completed: true },
  { text: "Проверить адаптивную верстку", completed: false },
  { text: "Повторить основы JavaScript", completed: false },
  { text: "Выделить время для отдыха", completed: false },
];

const listElement = document.querySelector(".to-do__list");
const formElement = document.querySelector(".to-do__form");
const inputElement = document.querySelector(".to-do__input");
const template = document.querySelector("#to-do__item-template");
const emptyElement = document.querySelector(".to-do__empty");
const filterButtons = document.querySelectorAll(".to-do__filter");
const clearButton = document.querySelector(".to-do__clear");

let currentFilter = "all";
let nextId = 0;

function createTask(text, completed = false) {
  nextId += 1;
  return { id: `task-${Date.now()}-${nextId}`, text, completed };
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Старый проект сохранял массив строк: поддерживаем и этот формат.
        return parsed
          .map((item) => {
            if (typeof item === "string") return createTask(item);
            if (item && typeof item.text === "string") {
              return createTask(item.text, Boolean(item.completed));
            }
            return null;
          })
          .filter((item) => item !== null && item.text.trim() !== "");
      }
    }
  } catch (error) {
    console.warn("Не удалось прочитать сохранённые задачи:", error);
  }
  return starterTasks.map((item) => createTask(item.text, item.completed));
}

let tasks = loadTasks();

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn("Не удалось сохранить задачи:", error);
  }
}

function updateCounters() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const remaining = total - completed;

  document.querySelector("#remaining-count").textContent = remaining;
  document.querySelector("#completed-count").textContent = completed;
  document.querySelector("#total-count").textContent = total;
  document.querySelector("#task-badge").textContent = total;
  document.querySelector("#filter-all-count").textContent = total;
  document.querySelector("#progress-fill").style.width =
    `${total === 0 ? 0 : Math.round((completed / total) * 100)}%`;
  clearButton.disabled = completed === 0;
}

function getVisibleTasks() {
  if (currentFilter === "active") return tasks.filter((task) => !task.completed);
  if (currentFilter === "completed") return tasks.filter((task) => task.completed);
  return tasks;
}

function changeTask(id, changes) {
  tasks = tasks.map((task) => task.id === id ? { ...task, ...changes } : task);
  saveTasks();
  renderTasks();
}

function createItem(task) {
  const item = template.content.querySelector(".to-do__item").cloneNode(true);
  const check = item.querySelector(".to-do__check");
  const text = item.querySelector(".to-do__item-text");
  const note = item.querySelector(".to-do__item-note");
  const edit = item.querySelector(".to-do__item-button_type_edit");
  const duplicate = item.querySelector(".to-do__item-button_type_duplicate");
  const remove = item.querySelector(".to-do__item-button_type_delete");

  text.textContent = task.text;
  note.textContent = task.completed ? "Выполнено" : "В работе";
  item.classList.toggle("to-do__item_done", task.completed);
  check.setAttribute("aria-pressed", String(task.completed));
  check.setAttribute("aria-label", task.completed ? "Вернуть в работу" : "Отметить как выполненную");

  check.addEventListener("click", () => changeTask(task.id, { completed: !task.completed }));

  duplicate.addEventListener("click", () => {
    const index = tasks.findIndex((current) => current.id === task.id);
    tasks.splice(index + 1, 0, createTask(task.text));
    saveTasks();
    renderTasks();
  });

  remove.addEventListener("click", () => {
    tasks = tasks.filter((current) => current.id !== task.id);
    saveTasks();
    renderTasks();
  });

  edit.addEventListener("click", () => {
    const oldText = task.text;
    text.contentEditable = "true";
    text.focus();
    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    function finish(save) {
      const value = text.textContent.trim().replace(/\s+/g, " ");
      text.contentEditable = "false";
      text.removeEventListener("keydown", onKeyDown);
      text.removeEventListener("blur", onBlur);
      if (save && value) changeTask(task.id, { text: value });
      else text.textContent = oldText;
    }
    function onKeyDown(event) {
      if (event.key === "Enter") { event.preventDefault(); finish(true); }
      if (event.key === "Escape") { event.preventDefault(); finish(false); }
    }
    function onBlur() { finish(true); }

    text.addEventListener("keydown", onKeyDown);
    text.addEventListener("blur", onBlur);
  });

  return item;
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  listElement.replaceChildren(...visibleTasks.map(createItem));
  emptyElement.hidden = visibleTasks.length > 0;
  emptyElement.textContent = tasks.length === 0
    ? "Здесь пока нет задач. Добавь первую — и начни с малого."
    : "В этой категории задач пока нет.";
  updateCounters();
}

formElement.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = inputElement.value.trim();
  if (!value) return;
  tasks.unshift(createTask(value));
  currentFilter = "all";
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle("to-do__filter_active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  saveTasks();
  renderTasks();
  formElement.reset();
  inputElement.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((filter) => {
      const isActive = filter === button;
      filter.classList.toggle("to-do__filter_active", isActive);
      filter.setAttribute("aria-pressed", String(isActive));
    });
    renderTasks();
  });
});

clearButton.addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
});

renderTasks();
