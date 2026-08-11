# Forge SDD — Plugin Cursor

Flujo **SDD local** empaquetado como plugin de Cursor: Paso 0 → Spec → MDD multi-agente → gates. **No requiere API de The Forge.**

Repositorio oficial del plugin (distribución). El monorepo [The Forge](https://github.com/OscarRubioSevilla/theforge) mantiene un workspace de demo en `packages/cursor-sdd-workspace/` y scripts para sincronizar prompts desde `apps/api`.

## Qué incluye

| Componente | Ubicación | Uso |
|------------|-----------|-----|
| Comandos `/forge-*`, `/init-forge` | `commands/` | Chat de Cursor |
| Skills | `skills/init-forge`, `skills/forge-workflow` | Orquestación del agente |
| Regla constitución | `rules/forge-sdd-constitution.mdc` | YAGNI, gates, cobertura Paso 0 |
| Prompts MDD | `prompts/mdd/` | Referencia para agentes del pipeline |
| Scripts | `scripts/` | Scaffold, validación Paso 0, UI |
| Plantillas | `templates/`, `paso0/` | Artefactos del proyecto |
| Panel UI | `ui/` | Dashboard local del workflow |

## Instalación (local / desarrollo)

Clona este repo e instala el plugin vía symlink:

```bash
git clone https://github.com/OscarRubioSevilla/theforge-plugin-cursor.git
mkdir -p ~/.cursor/plugins/local
ln -sf "$(pwd)/theforge-plugin-cursor" ~/.cursor/plugins/local/forge-sdd
```

En Cursor: **Developer: Reload Window**. Verifica en **Settings → Customize → Plugins** que aparece **Forge SDD**.

### Instalación de commands (`/forge-*`, `/init-forge`)

El plugin expone **skills** y **rules** vía `~/.cursor/plugins/local/`, pero los **commands** de plugins locales **no aparecen** de forma fiable en el menú `/` del chat (limitación conocida de Cursor). Usa una de estas opciones:

| Opción | Cómo |
|--------|------|
| **A — Recomendado** | Tras instalar el plugin, ejecuta `npm run install:commands` en este repo. Crea symlinks de `commands/*.md` en `~/.cursor/commands/`. |
| **B — Skills** | Invoca `/init-forge` o `/forge-workflow` (skills con invocación explícita). |

Tras `install:commands`, recarga Cursor: **Cmd+Shift+P → Developer: Reload Window** y prueba `/forge-paso0` o `/init-forge`.

Activa también **Settings → Include third-party Plugins, Skills, and other configs** si los skills del plugin no cargan.

### Instalación desde GitHub (sin clone manual)

También puedes apuntar el symlink a cualquier ruta donde hayas clonado el repo.

## Nuevo proyecto SDD

Con el plugin instalado:

```bash
# CLI (desde este repo)
npm run init-forge -- --no-cursor --target ~/proyectos/mi-app-sdd --name "Mi App" --idea "Descripción"

# O en el chat de Cursor
/init-forge name="Mi App" idea="Descripción del producto"
```

`--no-cursor` crea solo artefactos del proyecto (`WORKFLOW.yaml`, `paso0/`, `docs/sdd/`, `deliverables/`, `ui/`, `package.json`, scripts de panel). Los comandos `/forge-*` vienen del plugin.

Tras el scaffold, instala dependencias del panel UI una vez:

```bash
cd <tu-proyecto-sdd>
npm install
```

### Flujo típico

1. `/forge-paso0` — benchmark + catálogo D-IDs  
2. `/forge-spec` — spec funcional  
3. `/forge-mdd-pipeline` (o `/forge-mdd` para demo YAGNI)  
4. `/forge-gate` — validación y cierre  

### Paso 0 profundo

Por defecto el scaffold define `paso0.depth: deep` en `WORKFLOW.yaml`. El Paso 0 profundo produce un **Domain Benchmark** de 800–2000 líneas con **40–80 decisiones (D-IDs)**, incluyendo:

- Análisis de mercado y competencia (el agente puede usar búsqueda web)
- Personas y jobs-to-be-done
- Modelo de negocio y unit economics
- Modelo operativo (soporte, fraude, disputas, SLA)
- Checklist de **production readiness** (auth, observabilidad, backups, CI/CD, rate limits)
- Entidades canónicas, familias API, reglas BR-xxx y NFR cuantificados

Guía para el agente: `paso0/DEEP-PASO0-GUIDE.md`. Modo rápido: `paso0.depth: standard` (~20 D-IDs).

Un Paso 0 escaso (~18 D-IDs) suele generar un MDD de ~640 líneas; un Paso 0 deep (50+ D-IDs) alimenta un MDD de **1000+ líneas** tras el pipeline multi-agente.

## Calidad MDD (delivery gate local)

El plugin incluye validadores deterministas alineados con el delivery gate de The Forge:

```bash
npm run validate:paso0-coverage   # catálogo Paso 0 → secciones MDD
npm run validate:mdd-depth        # profundidad §1–§7, endpoints, Gherkin, manifest §7
```

`validate:mdd-depth` detecta MDDs **delgados** (secciones placeholder) y **contaminados** (D-IDs o patrones §0 copiados de otro dominio, p. ej. Workspace Chat en un proyecto Beauty Ride). Umbral: **score ≥ 90**, sin blockers. Informe en `deliverables/mdd-depth-report.json`.

Reglas anti-contaminación:

- Solo citar D-IDs de `paso0/decisions.catalog.json`
- §0 patrones de desarrollo **solo** si el catálogo declara `architecturePatterns[]`
- Tras `/forge-prepare-output`, ejecutar ambos validadores antes de marcar `gates.mdd`

## Panel UI

Cada proyecto scaffolded incluye un `package.json` con la dependencia `yaml` (lectura de `WORKFLOW.yaml`).

```bash
cd <tu-proyecto-sdd>
npm install   # solo la primera vez
npm run ui
# http://localhost:4173
```

## Construir / actualizar prompts

Desde **The Forge monorepo** (fuente de verdad de prompts en `apps/api`):

```bash
cd packages/cursor-sdd-workspace
FORGE_PLUGIN_ROOT=/ruta/a/theforge-plugin-cursor npm run sync:plugin
```

O dentro de este repo (si tienes el monorepo como hermano `../theforge`):

```bash
npm run build:plugin
```

(`vendor-prompts` lee `../theforge/apps/api/.../prompts/mdd/` cuando existe.)

## Estructura

```text
.cursor-plugin/plugin.json
commands/
skills/
rules/
prompts/mdd/
scripts/
templates/
ui/
paso0/
```

## Licencia

Apache-2.0 — ver [LICENSE](LICENSE).
