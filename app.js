const taskInput = document.querySelector("#tasks");
const energyInput = document.querySelector("#energy");
const hoursInput = document.querySelector("#hours");
const finishInput = document.querySelector("#finish");
const generateButton = document.querySelector("#generate");
const exampleButton = document.querySelector("#loadExample");
const emptyState = document.querySelector("#emptyState");
const plan = document.querySelector("#plan");

const lists = {
  urgent: document.querySelector("#urgentList"),
  important: document.querySelector("#importantList"),
  quick: document.querySelector("#quickList"),
  drop: document.querySelector("#dropList"),
  high: document.querySelector("#highEnergyList"),
  low: document.querySelector("#lowEnergyList"),
  ignore: document.querySelector("#ignoreToday"),
};

const blocksContainer = document.querySelector("#blocks");
const dayVerdict = document.querySelector("#dayVerdict");
const focusPill = document.querySelector("#focusPill");
const recommendationText = document.querySelector("#recommendationText");
const firstStep = document.querySelector("#firstStep");

const exampleTasks = [
  "Enviar propuesta al cliente antes de las 12",
  "Pagar factura que vence hoy",
  "Preparar reunión de las 16:00",
  "Responder mensajes importantes",
  "Confirmar cita médica",
  "Poner una lavadora",
  "Avanzar en el proyecto principal",
  "Revisar presupuesto mensual",
  "Ordenar carpetas digitales",
  "Limpiar toda la casa",
  "Mirar herramientas nuevas para organizarme",
  "Hacer ejercicio suave",
].join("\n");

const urgentWords = ["hoy", "vence", "antes", "urgente", "reunión", "reunion", "cliente", "entregar", "pagar", "plazo"];
const importantWords = ["proyecto", "informe", "propuesta", "presupuesto", "estrategia", "estudiar", "preparar", "crear", "avanzar"];
const quickWords = ["llamar", "confirmar", "enviar", "responder", "lavadora", "basura", "cita", "calendario", "justificante"];
const dropWords = ["ordenar", "reorganizar", "herramientas", "limpiar toda", "investigar", "rediseñar", "perfecto", "por si acaso"];
const highEnergyWords = ["crear", "escribir", "propuesta", "proyecto", "informe", "preparar", "estudiar", "diseñar", "decidir"];

function parseTasks(text) {
  return text
    .split(/\n|,|;/)
    .map((task) => task.trim())
    .filter(Boolean);
}

function hasAny(text, words) {
  const normalized = text.toLowerCase();
  return words.some((word) => normalized.includes(word));
}

function classify(task) {
  const lower = task.toLowerCase();
  const isDrop = hasAny(lower, dropWords);
  const isUrgent = hasAny(lower, urgentWords) && !isDrop;
  const isImportant = hasAny(lower, importantWords) && !isDrop && !isUrgent;
  const isQuick = hasAny(lower, quickWords) || lower.length < 32;
  const isHighEnergy = hasAny(lower, highEnergyWords) && !isQuick;

  return {
    task,
    urgent: isUrgent,
    important: isImportant,
    quick: isQuick && !isUrgent && !isDrop,
    drop: isDrop,
    highEnergy: isHighEnergy || isUrgent || isImportant,
    lowEnergy: !isHighEnergy || isQuick || isDrop,
  };
}

function unique(items) {
  return [...new Set(items)].filter(Boolean);
}

function renderList(element, items, fallback) {
  element.innerHTML = "";
  const safeItems = items.length ? items : [fallback];
  safeItems.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    element.append(li);
  });
}

function estimateMinutes(classified) {
  return classified.reduce((total, item) => {
    if (item.drop) return total + 20;
    if (item.quick) return total + 8;
    if (item.urgent) return total + 45;
    return total + 35;
  }, 0);
}

function buildBlocks(data, energy) {
  const urgent = data.filter((item) => item.urgent).map((item) => item.task);
  const important = data.filter((item) => item.important).map((item) => item.task);
  const quick = data.filter((item) => item.quick).map((item) => item.task);
  const low = data.filter((item) => item.lowEnergy && !item.drop).map((item) => item.task);

  const firstBlockTitle = energy === "baja" ? "Arranque amable" : "Impacto principal";
  const firstBlockItems = energy === "baja" ? unique([...quick.slice(0, 2), ...urgent.slice(0, 1)]) : unique([...urgent, ...important.slice(0, 1)]);

  return [
    {
      time: "Mañana",
      title: firstBlockTitle,
      items: firstBlockItems,
    },
    {
      time: "Mediodía",
      title: "Tareas rápidas",
      items: quick.slice(0, 4),
    },
    {
      time: "Tarde",
      title: "Trabajo importante",
      items: unique([...important.slice(0, 3), ...urgent.slice(1, 3)]),
    },
    {
      time: "Cierre",
      title: "Baja energía",
      items: unique([...low.slice(0, 3), "Elegir 3 prioridades de mañana"]),
    },
  ];
}

function renderBlocks(blocks) {
  blocksContainer.innerHTML = "";
  blocks.forEach((block) => {
    const div = document.createElement("div");
    div.className = "block";
    const time = document.createElement("time");
    time.textContent = block.time;
    const title = document.createElement("h3");
    title.textContent = block.title;
    const ul = document.createElement("ul");
    const items = block.items.length ? block.items : ["Dejar este bloque como margen de respiración"];
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      ul.append(li);
    });
    div.append(time, title, ul);
    blocksContainer.append(div);
  });
}

function generatePlan() {
  const tasks = parseTasks(taskInput.value);
  if (!tasks.length) {
    taskInput.value = exampleTasks;
  }

  const classified = parseTasks(taskInput.value).map(classify);
  const availableMinutes = Number(hoursInput.value || 7) * 60;
  const totalMinutes = estimateMinutes(classified);
  const overloaded = totalMinutes > availableMinutes;
  const energy = energyInput.value;

  const urgent = classified.filter((item) => item.urgent).map((item) => item.task);
  const important = classified.filter((item) => item.important).map((item) => item.task);
  const quick = classified.filter((item) => item.quick).map((item) => item.task);
  const drop = classified.filter((item) => item.drop).map((item) => item.task);
  const high = classified.filter((item) => item.highEnergy && !item.drop).map((item) => item.task);
  const low = classified.filter((item) => item.lowEnergy).map((item) => item.task);
  const ignore = unique([...drop, ...important.slice(3), ...quick.slice(5)]);
  const bestFirstStep = urgent[0] || important[0] || quick[0] || classified[0].task;

  renderList(lists.urgent, urgent, "Nada crítico detectado. Mantén el margen libre.");
  renderList(lists.important, important, "No hay tareas estratégicas claras. Puedes proteger espacio para pensar.");
  renderList(lists.quick, quick, "Sin tareas rápidas detectadas.");
  renderList(lists.drop, drop, "Nada evidente para delegar o soltar.");
  renderList(lists.high, high, "Usa este bloque para la tarea que más evitas.");
  renderList(lists.low, low, "Reserva este bloque para tareas mecánicas.");
  renderList(lists.ignore, ignore, "No hace falta soltar nada más hoy.");

  renderBlocks(buildBlocks(classified, energy));

  dayVerdict.textContent = overloaded ? "Hay demasiado para un solo día" : "Jornada realista y ejecutable";
  focusPill.textContent = overloaded ? "Enfoque: reducir sin culpa" : "Enfoque: impacto primero";
  recommendationText.textContent = overloaded
    ? `Asumo ${hoursInput.value} horas disponibles y cierre a las ${finishInput.value}. La lista supera ese espacio, así que hoy conviene cerrar lo urgente, hacer un bloque importante y posponer el resto sin convertirlo en deuda emocional.`
    : `Asumo energía ${energy}, ${hoursInput.value} horas disponibles y cierre a las ${finishInput.value}. Empieza por lo que vence o mueve más el día, agrupa lo rápido y deja el cierre para tareas de baja energía.`;
  firstStep.textContent = `Abre ahora: ${bestFirstStep}. Trabaja en ello 25 minutos antes de tocar otra cosa.`;

  emptyState.classList.add("hidden");
  plan.classList.remove("hidden");
}

exampleButton.addEventListener("click", () => {
  taskInput.value = exampleTasks;
  generatePlan();
});

generateButton.addEventListener("click", generatePlan);
