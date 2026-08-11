/**
 * Lee WORKFLOW.yaml y expone datos normalizados para la UI SDD.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export const PHASES = [
  "idea",
  "paso0",
  "spec",
  "mdd",
  "mdd_pipeline",
  "gates",
  "deliverables",
  "done",
];

export const PHASE_LABELS = {
  idea: "Idea",
  paso0: "Paso 0",
  spec: "Spec",
  mdd: "MDD",
  mdd_pipeline: "Pipeline MDD",
  gates: "Gates",
  deliverables: "Entregables",
  done: "Completado",
};

export const GATE_LABELS = {
  paso0: "Paso 0",
  spec: "Spec",
  paso0_mdd_coverage: "Cobertura Paso 0 → MDD",
  mdd: "MDD",
  delivery: "Entrega",
};

export const STATUS_LABELS = {
  pending: "Pendiente",
  running: "En curso",
  passed: "Aprobado",
  failed: "Fallido",
  skipped: "Omitido",
};

const PHASE_COMMANDS = {
  idea: { command: "forge-paso0", hint: "Iniciar Domain Benchmark (Paso 0)" },
  paso0: { command: "forge-paso0", hint: "Refinar benchmark y catálogo D-ID" },
  spec: { command: "forge-spec", hint: "Generar spec funcional desde Paso 0" },
  mdd: { command: "forge-mdd", hint: "Redactar MDD monolítico (demo rápida)" },
  mdd_pipeline: { command: "forge-mdd-pipeline", hint: "Orquestar pipeline multi-agente" },
  gates: { command: "forge-gate", hint: "Validar coherencia y gates de entrega" },
  deliverables: { command: "forge-gate", hint: "Completar blueprint, tasks y bundle" },
  done: { command: null, hint: "Flujo completado — revisar deliverables/" },
};

export function resolveWorkflowPath(root) {
  return join(root, "WORKFLOW.yaml");
}

export function readWorkflow(root) {
  const workflowPath = resolveWorkflowPath(root);
  if (!existsSync(workflowPath)) {
    throw new Error(`WORKFLOW.yaml no encontrado en: ${root}`);
  }
  const raw = readFileSync(workflowPath, "utf8");
  const data = parse(raw);
  const mtime = statSync(workflowPath).mtimeMs;
  return { path: workflowPath, raw, data, mtime };
}

function gateOrder(gates) {
  const preferred = ["paso0", "spec", "paso0_mdd_coverage", "mdd", "delivery"];
  const keys = Object.keys(gates ?? {});
  return [
    ...preferred.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !preferred.includes(k)),
  ];
}

function findNextPipelineAgent(agents, mode) {
  if (!Array.isArray(agents)) return null;

  const isActive = (agent) => {
    if (agent.status === "skipped") return false;
    if (mode === "high_split" && agent.id === "software_architect") return false;
    if (mode === "monolithic" && agent.id === "stack_architect") return false;
    return true;
  };

  const pending = agents.find((a) => isActive(a) && a.status === "pending");
  if (pending) return pending;

  const running = agents.find((a) => isActive(a) && a.status === "running");
  if (running) return running;

  return null;
}

function summarizeAgents(agents, mode) {
  if (!Array.isArray(agents)) {
    return { total: 0, passed: 0, pending: 0, failed: 0, skipped: 0, running: 0 };
  }

  const active = agents.filter((a) => {
    if (a.status === "skipped") return false;
    if (mode === "high_split" && a.id === "software_architect") return false;
    if (mode === "monolithic" && a.id === "stack_architect") return false;
    return true;
  });

  const count = (status) => active.filter((a) => a.status === status).length;
  return {
    total: active.length,
    passed: count("passed"),
    pending: count("pending"),
    failed: count("failed"),
    skipped: agents.filter((a) => a.status === "skipped").length,
    running: count("running"),
  };
}

function buildNextActions(data) {
  const actions = [];
  const phase = data.phase ?? "idea";
  const gates = data.gates ?? {};
  const pipeline = data.pipeline ?? {};
  const mode = pipeline.mode ?? "high_split";

  const phaseCmd = PHASE_COMMANDS[phase];
  if (phaseCmd?.command) {
    actions.push({
      type: "phase",
      command: phaseCmd.command,
      slash: `/${phaseCmd.command}`,
      hint: phaseCmd.hint,
    });
  }

  if (["mdd_pipeline", "mdd", "gates"].includes(phase)) {
    const nextAgent = findNextPipelineAgent(pipeline.agents, mode);
    if (nextAgent) {
      actions.push({
        type: "agent",
        command: nextAgent.command,
        slash: `/${nextAgent.command}`,
        hint: `Siguiente agente: ${nextAgent.name}`,
        agentId: nextAgent.id,
      });
    }
  }

  for (const gateId of gateOrder(gates)) {
    const gate = gates[gateId];
    if (gate?.status === "pending" || gate?.status === "failed") {
      actions.push({
        type: "gate",
        gateId,
        slash: "/forge-gate",
        hint: `Gate «${GATE_LABELS[gateId] ?? gateId}» ${STATUS_LABELS[gate.status] ?? gate.status}`,
      });
      break;
    }
  }

  if (phase === "deliverables" && gates.delivery?.status !== "passed") {
    actions.push({
      type: "deliverables",
      slash: null,
      hint: "Completar docs/sdd/blueprint.md, tasks.md y deliverables/sdd-bundle.md",
    });
  }

  return actions.slice(0, 4);
}

export function buildWorkflowViewModel(root) {
  const { path, data, mtime } = readWorkflow(root);
  const phase = data.phase ?? "idea";
  const phaseIndex = Math.max(0, PHASES.indexOf(phase));
  const pipeline = data.pipeline ?? {};
  const mode = pipeline.mode ?? "high_split";
  const agents = Array.isArray(pipeline.agents) ? pipeline.agents : [];
  const agentSummary = summarizeAgents(agents, mode);

  const gates = data.gates ?? {};
  const gatesList = gateOrder(gates).map((id) => ({
    id,
    label: GATE_LABELS[id] ?? id,
    status: gates[id]?.status ?? "pending",
    statusLabel: STATUS_LABELS[gates[id]?.status ?? "pending"] ?? gates[id]?.status,
    checks: gates[id]?.checks ?? [],
    dependsOn: gates[id]?.depends_on ?? gates[id]?.dependsOn ?? [],
  }));

  const agentsList = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    command: agent.command,
    slash: agent.command ? `/${agent.command}` : null,
    status: agent.status ?? "pending",
    statusLabel: STATUS_LABELS[agent.status ?? "pending"] ?? agent.status,
    sections: agent.sections ?? [],
    parallelGroup: agent.parallel_group ?? agent.parallelGroup ?? null,
    outputArtifact: agent.output_artifact ?? agent.outputArtifact ?? null,
    isCurrent: pipeline.current_agent === agent.id,
    note: agent.note ?? null,
  }));

  return {
    meta: {
      root,
      workflowPath: path,
      mtime,
      fetchedAt: new Date().toISOString(),
    },
    project: {
      id: data.project?.id ?? null,
      name: data.project?.name ?? "Sin nombre",
      idea: (data.project?.idea ?? "").trim(),
    },
    phase: {
      id: phase,
      label: PHASE_LABELS[phase] ?? phase,
      index: phaseIndex,
      total: PHASES.length,
    },
    phases: PHASES.map((id, index) => ({
      id,
      label: PHASE_LABELS[id] ?? id,
      index,
      isCurrent: id === phase,
      isComplete: index < phaseIndex || phase === "done",
    })),
    pipeline: {
      mode,
      currentAgent: pipeline.current_agent ?? null,
      deliveryGate: pipeline.delivery_gate ?? pipeline.deliveryGate ?? null,
      summary: agentSummary,
      agents: agentsList,
    },
    gates: gatesList,
    artifacts: data.artifacts ?? {},
    nextActions: buildNextActions(data),
  };
}
