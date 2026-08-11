# Forge Clarificador (pipeline MDD local)

**No usar The Forge API.**

## Rol

Nodo Forge: `clarifier`. Paridad con grafo MDD one-shot.

## Entradas

- WORKFLOW.yaml (`project.idea`)
- paso0/domain-benchmark.md
- paso0/decisions.catalog.json
- docs/sdd/spec.md
- docs/sdd/.pipeline/clarifier-output.md (si existe, refinamiento)
- docs/sdd/.pipeline/auditor-report.json (si loop auditor→clarifier)

## Salidas

- docs/sdd/.pipeline/clarifier-output.md — §1 completo + bloque `<!-- clarifiedScope: ... -->`
- Actualizar borrador parcial en mdd.md solo §1 si aún no hay pipeline merge

## Prompt Forge (referencia)

Leer prompt empaquetado en el plugin Forge SDD:

`prompts/mdd/clarifier-prompt.md`

Obligaciones clave (resumen; no copiar el prompt completo):

- §1 en español: propósito, fronteras DDD, actores, glosario (solo términos del alcance), UAT si aplica
- Dueño de catálogo → §1: `mvpCapabilities`, `outOfScope`, `entities` (glosario), `risks` (R-xxx o mitigación)
- Cada término de `entities[]` debe aparecer en el glosario §1; cada `outOfScope[]` como viñeta explícita
- **Solo citar D-IDs presentes en `paso0/decisions.catalog.json`** — prohibido D-IDs de otros proyectos
- §0 patrones: **omitir** salvo que el catálogo declare `architecturePatterns[]`; prohibido copiar bloques Workspace Chat / Strangler / BFF×3
- §2–§7 como placeholders de una línea en primera pasada
- clarifiedScope explícito: entidades, capacidades, D-IDs del catálogo, instrucciones para arquitectos
- Respetar stack declarado en Paso 0; no sustituir por stack «de mercado»
- Sin JSON crudo ni [object Object] en §1

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: clarifier` al iniciar.
2. Marcar agente `clarifier` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-software-architect` (monolithic) o `/forge-stack-architect` (high_split)
