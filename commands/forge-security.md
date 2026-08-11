# Forge Arquitecto de Seguridad (§6) (pipeline MDD local)

**No usar The Forge API.** Profundidad MDD **enterprise siempre activa**.

> **Opcional:** solo si el critic o delivery gate lo exige.


## Rol

Nodo Forge: `security`. Paridad con grafo MDD one-shot.

## Entradas

- docs/sdd/mdd.md o sec-int-draft
- clarifier-output

## Salidas

- docs/sdd/.pipeline/security-draft.md — §6

## Prompt Forge (referencia)

Leer prompt empaquetado: `prompts/mdd/security-architect-prompt.md`

Ruta(s): `prompts/mdd/security-architect-prompt.md`

Obligaciones clave (resumen; **no sustituye** leer el prompt completo):

- Solo §6; subsecciones con ≥3 viñetas reales
- Coherencia con §3 (MFA, RBAC, audit)
- Usar en delivery gate loop cuando fix_target = security

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: security` al iniciar.
2. Marcar agente `security` con `status: running` → `passed` (o `failed` / `skipped`).
3. Avanzar `pipeline.current_agent` al siguiente agente no skipped.

## Siguiente

`/forge-integration` o `/forge-formatter`
