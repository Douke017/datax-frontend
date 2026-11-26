# Guía Oficial de Diseño, Arquitectura y Experiencia de Usuario v2.1 (Frontend Guidelines)

> **DATAX — Plataforma de Prospección e Ingeniería de Datos en Bruto**  
> *Versión 2.1 — Alineada estrictamente con `UI_CONSTRAINTS.md` y `/home/douke017/Datax/CONSTRAINTS.md` (Angular 22)*

---

## 1. Audiencia Real y Principio Rector

### 1.1 Audiencia Objetivo
La consola web DATAX es una herramienta operativa de producción utilizada por:
- **Analistas y Científicos de Datos**: Buscan portales y archivos en el catálogo, verifican disponibilidad antes de descargar, consultan el historial real de descargas y robots, y exportan catálogos y archivos directamente en formato original, **Excel (`.xlsx`)** o **CSV**.
- **Operadores de Prospección**: Gestionan la exploración de fuentes web, configuran parámetros y URLs de respaldo, atienden alertas ante cambios en portales y supervisan la cola real de descargas y la conciliación entre Prospector Externo e Interno.

### 1.2 Principio Rector: Operación Real, Español Claro y Cero Controles Simulados
- **Cero simulaciones o `Dry-Run` en UI de producción**: Prohibidos los botones o modos de simulación (`"Simular Plan de Sincronización"`, `"Probar Extracción (Dry-Run)"`, `"DRY_RUN"`, `"Evaluar Lote (DRY_RUN)"`). Ver `UI_CONSTRAINTS.md` §1.
- **Cero framing financiero/BI prematuro**: No disfrazar activos en bruto como reportes contables ni imponer métricas financieras (`ROA`, `ROE`, `mora`, `Bs.`).
- **100% español operativo claro**: Prohibido exponer jerga interna de infraestructura (`SKIP LOCKED`, `SSE`, `BFS`, `CKAN`, `HMAC`, `ETag`, `Entrypoint`, `Seeds`, `Failover`, `Workflow`, `Diff`, `Bronze`, `Gold`), enums sin traducir (`ACTIVE`, `WEEKLY`, `COMPLETED`, `MANUAL_FILE`, `CONSOLIDADO_GOLD`), rutas de contenedor (`/app/data/...`), vistas previas `YAML` o paneles de código `Python / R / DuckDB / Power Query` en la UI operativa.
- **Cero metatextos de IA y cero emojis Unicode**: Nunca mostrar `"Objetivo 1..5"`, `"HUI-*"`, ni emojis en la interfaz.

---

## 2. Arquitectura Canónica en Angular 22 (Inmutable)

### 2.1 Separación Física Obligatoria de Componentes
Prohibido el inlining masivo de templates o estilos. Todo componente en `frontend/src/app/` DEBE dividirse en tres archivos físicos:
1. `*.component.ts`: Lógica de clase, inyección de dependencias, `signal()` y `computed()`, manejadores de eventos.
2. `*.component.html`: Marcado semántico accesible con control de flujo canónico (`@if`, `@for`, `@switch`).
3. `*.component.css`: Estilos encapsulados del componente.

### 2.2 Shell de Navegación Sin Redundancias
- **Una única barra de navegación principal** (sin repetir los mismos módulos en header y sidebar robando espacio horizontal).
- **Prohibido el selector global desconectado `"Entidad Activa"`** (`InstitutionStateService` estático queda obsoleto y retirado).
- Optimizado para monitores de ciencia e ingeniería de datos (`1280px` a `2560px+`), maximizando el ancho útil para tablas anchas (URLs, hashes SHA-256, nombres de columnas y métricas).
- **Monitor de salud verídico** para ambos servicios (`Prospector Externo :8000` y `Prospector Interno :8001`).

---

## 3. Estándares de Interacción de Grado Producción

### 3.1 Paleta de Comandos y Búsqueda Global (`Ctrl+K` / `Cmd+K`)
- Invocable desde cualquier vista con teclado.
- Busca instantáneamente por fuente web, archivo en bruto, **nombre de columna del diccionario**, huella SHA-256, alerta o corrida y navega abriendo directamente el panel lateral del recurso.

### 3.2 Tablas de Ingeniería (*Data Grids*)
Toda tabla operativa (Catálogo Externo, Inventario de Enlaces, Custodia Bruta, Cola de Descargas, Alertas, Resultados SQL) DEBE cumplir:
- **Paginación, ordenamiento y filtrado server-side** (nunca cargar miles de filas al navegador para paginar en memoria).
- **Filtros sincronizados en los query params de la URL** con chips removibles para compartir vistas filtradas por enlace.
- **Selección múltiple con barra contextual de acciones en lote** (ej. *"Verificar y Encolar Descarga"*, *"Exportar CSV / Excel"*).
- **Alineación numérica tabular (`font-variant-numeric: tabular-nums`)** y tipografía monoespaciada para tamaños, tiempos (`ms`), fechas, códigos HTTP y firmas de integridad.
- **Copiado en 1 clic** (URL, código de robot o huella de archivo) con confirmación mediante toast no intrusivo.

### 3.3 Paneles Laterales de Inspección (*Slide-over Drawers*)
- Hacer clic en cualquier fila abre un panel lateral con pestañas operativas (**Metadatos**, **Vista previa de datos**, **Historial de versiones**, **Trazabilidad** o **Detalle de cambios**).
- Cerrable con tecla `Escape` o botón explícito sin destruir la posición de scroll ni los filtros de la tabla subyacente.

### 3.4 Formularios, Flujo Natural y Controles Honestos
- **Cero barras `fixed` o `sticky` inferiores** que tapen inputs o scroll; las acciones de guardado viven en un `<footer>` de flujo natural (`position: static`).
- **Cero editores ni vistas previas de YAML/JSON crudo**: solo controles tipados e interactivos (chips, listas con validación y reordenamiento de prioridad).
- **Cero controles simulados, `Dry-Run` o de demostración**: prohibidos los botones de simulación (`Simular Plan de Sincronización`, `Probar Extracción (Dry-Run)`, `Evaluar Lote (DRY_RUN)`), escenarios de demo y cambios de estado sin acción real auditable.
- **Cero `window.alert()` / `window.confirm()`**: usar diálogos modales accesibles y notificaciones toast no intrusivas.
- **Estados honestos y actualización en vivo**: actualización en tiempo real de corridas y cola de descargas, **skeleton loaders** durante carga, estados vacíos accionables y estados de error explícitos con botón *"Reintentar"*.

---

## 4. Accesibilidad, Semántica Visual y Verificación

- **Contraste WCAG AA+** en texto, etiquetas, badges y tablas; estados `focus-visible` claros y navegación completa por teclado.
- **Semántica de estado**:
  - Verde (`--success`): Operativo / Lista Blanca / Verificado SHA-256 / `ESPEJO_VIVO` / `COMPLETED`.
  - Ámbar (`--warning`): Advertencia / `WARNING` / `DEDUPLICATED` / `HISTORICO_SOLO_LECTURA` / `RECONOCIDA`.
  - Rojo (`--danger`): Crítico / `SUSPENDED` / `FAILED` / `SCHEMA_DRIFT` / `VOLUME_DROP` / Inconsistencia SHA-256.
  - Azul / Cian (`--primary`, `--info`): En ejecución (`RUNNING` / `DOWNLOADING`), enlaces de navegación y filtros activos.
- **Criterio de aceptación obligatorio antes de cerrar cambios UI**:
  ```bash
  cd /home/douke017/Datax/frontend && npx ng build
  ```
  Resultado exigido: **0 errores de compilación y 0 advertencias**.
