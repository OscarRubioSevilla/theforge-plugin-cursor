---
name: init-forge
description: >-
  Inicializa un workspace SDD (WORKFLOW.yaml, Paso 0, docs/sdd, deliverables, ui).
  Usar cuando el usuario diga init_forge, init forge, scaffold SDD o nuevo proyecto forge.
  Con el plugin Forge SDD instalado, no copiar .cursor/ (comandos vienen del plugin).
disable-model-invocation: true
---

# Init Forge — scaffold SDD

Crea la estructura **WORKFLOW.yaml como SSOT** en un proyecto nuevo. Los slash commands `/forge-*` los provee el **plugin Forge SDD** instalado en Cursor.

## Entrada del usuario

Extraer del mensaje:

- **name** — nombre del producto (obligatorio)
- **idea** — descripción breve de la idea (obligatorio)
- **mode** — `high_split` (default) o `monolithic` si lo indica
- **slug** — kebab-case opcional
- **target** — carpeta destino (default: raíz del workspace abierto)
- **monorepo-subdir** — solo si crea bajo el monorepo The Forge

Si falta **name** o **idea**, preguntar antes de ejecutar.

## WORKFLOW.yaml existente

Si ya existe `WORKFLOW.yaml` en el destino: no usar `--force` sin confirmación explícita.

## Ejecutar el script

**Con plugin instalado** (solo artefactos del proyecto, sin copiar `.cursor/`):

```bash
npx @theforge/cursor-sdd-workspace init-forge \
  --no-cursor \
  --target "<DESTINO>" \
  --name "<NOMBRE>" \
  --idea "<DESCRIPCIÓN>" \
  [--slug "<slug>"] \
  [--mode high_split|monolithic] \
  [--force]
```

**Desde monorepo The Forge** (scaffold completo con `.cursor/` local):

```bash
node packages/cursor-sdd-workspace/scripts/init-forge.mjs \
  --target "<DESTINO>" \
  --name "<NOMBRE>" \
  --idea "<DESCRIPCIÓN>"
```

Subcarpeta del monorepo:

```bash
node packages/cursor-sdd-workspace/scripts/init-forge.mjs \
  --monorepo-subdir "packages/my-app-sdd" \
  --name "<NOMBRE>" \
  --idea "<DESCRIPCIÓN>"
```

## Verificación

Tras ejecutar, comprobar:

- `WORKFLOW.yaml` (`phase: idea`, gates `pending`)
- `paso0/domain-benchmark.md`, `paso0/decisions.catalog.json`, `paso0/TEMPLATE.md`
- `docs/sdd/spec.md`, `mdd.md`, `blueprint.md`, `tasks.md`, `.pipeline/`
- `deliverables/`, `ui/`, `scripts/serve-sdd-ui.mjs`

Con plugin: **no** hace falta `.cursor/commands` en el proyecto.

## Respuesta al usuario

Resumir ruta creada, slug, modo pipeline y **próximo paso**: `/forge-paso0`.

Indicar abrir la carpeta como workspace en Cursor si el scaffold fue fuera del workspace actual.
