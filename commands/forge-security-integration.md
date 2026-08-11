# Forge Seguridad + Integración (paralelo) (pipeline MDD local)

**No usar The Forge API.** Profundidad MDD **enterprise siempre activa**.

**Paralelo:** `parallel_group: sec_int` — puede ejecutarse junto al otro agente del grupo.


## Rol

Nodo Forge: `security_integration`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/.pipeline/mdd-after-architect.md
- docs/sdd/.pipeline/clarifier-output.md

## Salidas

- docs/sdd/.pipeline/sec-int-draft.md — §6 y §7

## Prompt Forge (referencia)

Leer prompt empaquetado: `prompts/mdd/security-architect-prompt.md + prompts/mdd/integration-engineer-prompt.md`

Ruta(s): `prompts/mdd/security-architect-prompt.md + prompts/mdd/integration-engineer-prompt.md`

Obligaciones clave (resumen; **no sustituye** leer el prompt completo):

- §6: controles acotados al alcance; schemaRequirements si faltan tablas
- §7: 7.1–7.4+ manifest JSON (stack, deployment, security, integration_metadata)
- §7 no duplica §6; sizing CPU/memoria en 7.4
- Ejecutar §6 y §7 en paralelo (misma pasada)

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: security_integration` al iniciar.
2. Marcar agente `security_integration` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-formatter` (modo after_redactor)
