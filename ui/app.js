const REFRESH_MS = 5000;

const $ = (sel, root = document) => root.querySelector(sel);

let refreshTimer = null;

function badgeClass(status) {
  return `badge badge--${status ?? "pending"}`;
}

function formatTime(iso) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const prev = btn.textContent;
    btn.textContent = "Copiado";
    setTimeout(() => {
      btn.textContent = prev;
    }, 1200);
  } catch {
    btn.textContent = "Error";
  }
}

function renderDeliveryGate(container, deliveryGate) {
  container.innerHTML = "";
  if (!deliveryGate) {
    container.innerHTML = '<p class="action-item__hint">Sin datos de delivery gate.</p>';
    return;
  }

  const rows = [
    ["Umbral", deliveryGate.score_threshold ?? deliveryGate.scoreThreshold ?? "—"],
    ["Último score", deliveryGate.last_score ?? deliveryGate.lastScore ?? "—"],
    ["Iteraciones máx.", deliveryGate.max_iterations ?? deliveryGate.maxIterations ?? "—"],
    ["Fix target", deliveryGate.fix_target ?? deliveryGate.fixTarget ?? "—"],
    [
      "Blockers",
      Array.isArray(deliveryGate.blockers) && deliveryGate.blockers.length
        ? deliveryGate.blockers.join(", ")
        : "Ninguno",
    ],
  ];

  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "kv";
    row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    container.appendChild(row);
  }
}

function renderActions(list, actions) {
  list.innerHTML = "";
  if (!actions?.length) {
    const li = document.createElement("li");
    li.className = "action-item";
    li.innerHTML = '<span class="action-item__hint">No hay acciones pendientes.</span>';
    list.appendChild(li);
    return;
  }

  for (const action of actions) {
    const li = document.createElement("li");
    li.className = "action-item";

    const hint = document.createElement("span");
    hint.className = "action-item__hint";
    hint.textContent = action.hint;
    li.appendChild(hint);

    if (action.slash) {
      const cmdRow = document.createElement("div");
      cmdRow.className = "action-item__cmd";

      const pill = document.createElement("span");
      pill.className = "cmd-pill";
      pill.textContent = action.slash;
      cmdRow.appendChild(pill);

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "btn btn--ghost copy-btn";
      copyBtn.textContent = "Copiar";
      copyBtn.addEventListener("click", () => copyText(action.slash, copyBtn));
      cmdRow.appendChild(copyBtn);

      li.appendChild(cmdRow);
    }

    list.appendChild(li);
  }
}

function renderGates(container, gates) {
  container.innerHTML = "";
  for (const gate of gates) {
    const card = document.createElement("article");
    card.className = "gate-card";

    const title = document.createElement("h4");
    title.className = "gate-card__title";
    title.textContent = gate.label;
    card.appendChild(title);

    const badge = document.createElement("span");
    badge.className = badgeClass(gate.status);
    badge.textContent = gate.statusLabel;
    card.appendChild(badge);

    if (gate.checks?.length) {
      const ul = document.createElement("ul");
      for (const check of gate.checks.slice(0, 4)) {
        const li = document.createElement("li");
        li.textContent = check;
        ul.appendChild(li);
      }
      if (gate.checks.length > 4) {
        const li = document.createElement("li");
        li.textContent = `+${gate.checks.length - 4} más…`;
        ul.appendChild(li);
      }
      card.appendChild(ul);
    }

    container.appendChild(card);
  }
}

function renderAgents(tbody, agents) {
  tbody.innerHTML = "";
  for (const agent of agents) {
    const tr = document.createElement("tr");
    if (agent.isCurrent) tr.classList.add("is-current");

    const nameTd = document.createElement("td");
    nameTd.innerHTML = `<strong>${agent.name}</strong>${agent.isCurrent ? ' <span class="badge badge--running">Actual</span>' : ""}`;
    tr.appendChild(nameTd);

    const cmdTd = document.createElement("td");
    cmdTd.innerHTML = agent.slash
      ? `<code>${agent.slash}</code>`
      : '<span class="action-item__hint">—</span>';
    tr.appendChild(cmdTd);

    const secTd = document.createElement("td");
    secTd.textContent = (agent.sections ?? []).join(", ") || "—";
    tr.appendChild(secTd);

    const statusTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = badgeClass(agent.status);
    badge.textContent = agent.statusLabel;
    statusTd.appendChild(badge);
    tr.appendChild(statusTd);

    tbody.appendChild(tr);
  }
}

function renderPhaseTrack(container, phases) {
  container.innerHTML = "";
  for (const step of phases) {
    const el = document.createElement("div");
    el.className = "phase-step";
    if (step.isCurrent) el.classList.add("is-current");
    if (step.isComplete) el.classList.add("is-complete");
    el.textContent = step.label;
    el.title = step.id;
    container.appendChild(el);
  }
}

function render(data) {
  const tpl = $("#tpl-content");
  const content = $("#content");
  content.innerHTML = "";
  const node = tpl.content.cloneNode(true);

  $(".project-name", node).textContent = data.project.name;
  $(".project-idea", node).textContent = data.project.idea || "Sin descripción de idea.";
  $(".phase-badge__value", node).textContent = data.phase.label;

  renderPhaseTrack($(".phase-track", node), data.phases);
  renderActions($(".actions-list", node), data.nextActions);
  renderDeliveryGate($(".delivery-gate", node), data.pipeline.deliveryGate);
  renderGates($(".gates-grid", node), data.gates);

  const summary = data.pipeline.summary;
  $(".pipeline-summary", node).textContent =
    `${summary.passed}/${summary.total} agentes completados · modo ${data.pipeline.mode}`;

  renderAgents($(".agents-body", node), data.pipeline.agents);

  content.appendChild(node);
  content.classList.remove("hidden");

  $("#meta-line").textContent = `Actualizado: ${formatTime(data.meta.fetchedAt)} · ${data.meta.workflowPath}`;
}

async function fetchWorkflow() {
  const res = await fetch("/api/workflow", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function refresh() {
  const loading = $("#loading");
  const error = $("#error");
  const content = $("#content");

  try {
    const data = await fetchWorkflow();
    loading.classList.add("hidden");
    error.classList.add("hidden");
    render(data);
  } catch (err) {
    loading.classList.add("hidden");
    content.classList.add("hidden");
    error.classList.remove("hidden");
    error.textContent = `Error al leer WORKFLOW.yaml: ${err.message}`;
  }
}

function scheduleAutoRefresh(enabled) {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (enabled) {
    refreshTimer = setInterval(refresh, REFRESH_MS);
  }
}

$("#refresh-btn").addEventListener("click", () => refresh());

const autoRefresh = $("#auto-refresh");
autoRefresh.addEventListener("change", () => scheduleAutoRefresh(autoRefresh.checked));

scheduleAutoRefresh(autoRefresh.checked);
refresh();
