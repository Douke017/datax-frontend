# UI_CONSTRAINTS.md — Restricciones Inmutables de la Consola Web DATAX

> Este archivo replica y aplica las restricciones obligatorias de `/home/douke017/Datax/CONSTRAINTS.md` dentro del repositorio `datax-frontend` para que todo desarrollador, agente y pipeline de CI las haga cumplir sin excepciones.

## 1. Prohibiciones Absolutas en Plantillas (`src/app/**/*.html`)

| Categoría | Expresiones / Patrones Prohibidos | Reemplazo Permitido |
| :--- | :--- | :--- |
| **Simulaciones / Dry-Run** | `Simular`, `SIMULACIÓN`, `Dry-Run`, `DRY_RUN`, `SIN LOCK (DRY_RUN)`, `Pre-Vuelo` | Eliminar el botón o presentar consulta real (ej. `Verificar disponibilidad`, `Actualizar conciliación`) |
| **Código / Formatos de Dev** | `proyección YAML`, `YAML`, `JSONL`, `Parquet` (como acción primaria), `Python / R`, `Polars`, `Pandas`, `DuckDB`, `Power Query`, `<app-code-snippets-panel>` en vistas operativas | Exportación directa **Excel (.xlsx)** y **CSV** |
| **Jerga de Infraestructura** | `SKIP LOCKED`, `Worker Pool`, `SSE`, `Stream`, `BFS`, `CKAN`, `HMAC`, `ETag`, `Entrypoint`, `Seeds`, `Failover`, `Workflow`, `Diff`, `locks fantasma`, `callback`, `Bronze`, `Gold`, `Taiga MD` | Español operativo claro (`En vivo`, `URL principal`, `URLs de respaldo`, `Comparación de cambios`, `Archivos en custodia`) |
| **Enums Crudos en Inglés** | `ACTIVE`, `WARNING`, `SUSPENDED`, `DAILY`, `WEEKLY`, `MONTHLY`, `COMPLETED`, `RUNNING`, `FAILED`, `CANCELLED`, `QUEUED`, `HEALTHY`, `DEGRADED`, `OFFLINE`, `LATEST`, `MANUAL_FILE`, `AUTOMATIZADO_DAG`, `CONSOLIDADO_GOLD`, `ESPEJO_VIVO`, `BUDGET_LIMIT`, `DOM_CHANGED`, `BOT_BLOCKED`, `TLS_HOLD`, `HTTP_5XX` | Formatear siempre mediante funciones auxiliares en español legible |
| **Rutas y Tablas Internas** | `/app/data/bronze/...`, `resource_status_audit`, `mongodb (prospector_externo)` | Nombre legible del archivo o descripción humana |
| **Spanglish / Metatexto / Nativo** | `& Bridge`, `Copiar Key`, `Download ID`, `Limpiar log`, `Encoding`, `Objetivo 1..5`, `HUI-*`, emojis Unicode, `window.alert`, `window.confirm` | Español limpio + modales accesibles + notificaciones toast |

## 2. Reglas Obligatorias de Layout y Componentes

1. **3 archivos por componente** (`.component.ts`, `.component.html`, `.component.css`); prohibido `template:` o `styles:` inline.
2. **Cero overflow horizontal** (`documentElement.scrollWidth <= documentElement.clientWidth`) en `1280px` y `1440px`.
3. **Cero `<select>` en blanco**: toda lista desplegable con valor inicial debe mostrar su opción seleccionada al cargar.
4. **Cero barras `fixed`/`sticky` inferiores** tapando formularios.
5. **Cero columnas duplicadas** (nunca mostrar slug normalizado + nombre legible simultáneamente).

## 3. Compuerta Pre-Despliegue Obligatoria

Antes de construir imagen Docker o hacer push a `main`:
1. Confirmar `0` ocurrencias de términos prohibidos de la tabla §1 en `src/app/**/*.html`.
2. Ejecutar `npx ng build` con **0 errores y 0 advertencias**.
3. Revisar visualmente mediante capturas de pantalla (`1440x900`) todas las vistas modificadas comprobando `0` errores HTTP/consola, `overflowX = false`, `0` `<select>` en blanco y `0` botones fuera de su tarjeta.
