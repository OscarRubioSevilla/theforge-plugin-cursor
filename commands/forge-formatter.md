# Forge Formateador determinista (pipeline MDD local)

**No usar The Forge API.**

## Rol

Nodo Forge: `format_after_architect | format_after_redactor`. Paridad con grafo MDD one-shot.

## Entradas

- Sidecars del tramo actual (architect / sec-int)
- docs/sdd/mdd.md parcial

## Salidas

- docs/sdd/.pipeline/mdd-after-architect.md o mdd-after-redactor.md
- Normalizar fences, headings, §4.A antes de §4.B

## Prompt Forge (referencia)

Leer prompt empaquetado en el plugin Forge SDD:

`prompts/mdd/mdd-formatter-prompt.md`

Obligaciones clave (resumen; no copiar el prompt completo):

- Sin LLM destructivo: solo normalización estructural
- Promover fences SQL/JSON; corregir headings pegados
- No eliminar contenido sustancial

## Actualizar WORKFLOW.yaml

1. `pipeline.current_agent: format_after_architect` al iniciar.
2. Marcar agente `format_after_architect` con `status: running` → `passed` (o `failed` / `skipped`).
3. Ejecutar dos veces en pipeline completo; marcar el agente correspondiente en WORKFLOW.yaml

## Siguiente

after_architect → `/forge-security-integration`; after_redactor → paralelo consistency+diagram
