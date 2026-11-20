# Guía Oficial de Diseño, Arquitectura y Experiencia de Usuario v2.0 (Frontend Guidelines)

> **DATAX — Plataforma de Prospección e Ingeniería de Datos en Bruto**  
> *Versión 2.0 — Estándar Obligatorio para Ciencia e Ingeniería de Datos (Angular 22)*

---

## 1. Audiencia Real y Principio Rector

### 1.1 Audiencia Objetivo
La consola web DATAX es una herramienta operativa de ingeniería de datos utilizada por:
- **Científicos de Datos**: Buscan archivos en bruto y columnas en el catálogo, verifican preexistencia/reutilización en el Gatekeeper, inspeccionan esquemas y muestras crudas sin bajar archivos masivos, ejecutan consultas SQL `SELECT` de solo lectura y extraen insumos en formato binario original, `Parquet`, `CSV` o `JSONL` para Python (`polars`, `pandas`, `duckdb`), R y Jupyter.
- **Ingenieros de Datos / Operadores**: Gestionan la exploración web abierta, simulan políticas (`Dry-Run`), supervisan resiliencia/contingencias, atienden alertas estructurales con diff de selectores y monitorean colas reales de descarga.

### 1.2 Principio Rector: Datos en Bruto, Precisión Técnica y Cero Humo
- **Cero framing financiero/BI prematuro**: No disfrazar conceptos técnicos reales como "cierre contable" ni mostrar dashboards de indicadores financieros (`ROA`, `ROE`, `mora`, formateo forzado en `Bs.`) cuando el equipo trabaja exclusivamente sobre datos en bruto.
- **Terminología técnica precisa en 100% español profesional**: Usar nombres claros y honestos de ingeniería de datos (`Parquet`, `SHA-256`, `SQL solo lectura`, `Custodia en Bruto`, `Control Previo`, `Cola de Descargas`, `Respaldos de Contingencia`, `Diff Estructural`), evitando spanglish descuidado, metatextos de IA (`"Objetivo 1"`, `"HUI-12"`, `"El agente ha determinado..."`) y emojis Unicode.

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
- **Selección múltiple con barra contextual de acciones en lote** (ej. *"Validar y Encolar en Interno"*, *"Exportar Manifiesto JSONL/Parquet"*).
- **Alineación numérica tabular (`font-variant-numeric: tabular-nums`)** y tipografía monoespaciada para bytes, latencias (`ms`), fechas ISO, códigos HTTP y firmas SHA-256.
- **Copiado en 1 clic** (URL, SHA-256, `resource_key`, snippets Python/R/cURL) con confirmación mediante toast no intrusivo.

### 3.3 Paneles Laterales de Inspección (*Slide-over Drawers*)
- Hacer clic en cualquier fila abre un Drawer lateral con pestañas técnicas (**Metadatos**, **Esquema y Muestra Cruda de 20 filas**, **Historial de Versiones SHA-256**, **Linaje**, **Diff Estructural** o **Snippets de Código**).
- Cerrable con tecla `Escape` o botón explícito sin destruir la posición de scroll ni los filtros de la tabla subyacente.

### 3.4 Formularios, Flujo Natural y Controles Honestos
- **Cero barras `fixed` o `sticky` inferiores** que tapen inputs o scroll; las acciones de guardado viven en un `<footer>` de flujo natural (`position: static`).
- **Cero editores de texto libre en YAML/JSON crudo**: controles tipados e interactivos (chips, listas con validación y reordenamiento de prioridad); si existe vista previa declarativa, es plegable y estrictamente de solo lectura.
- **Cero controles simulados o de demostración**: prohibidos los "Escenarios rápidos de verificación", el registro manual de estados falsos en la cola de descargas y los `<select>` o switches que alteren estado productivo sin máquina de estados o diálogo accesible de justificación obligatoria.
- **Cero `window.alert()` / `window.confirm()`**: usar diálogos modales accesibles y notificaciones toast no intrusivas.
- **Estados honestos y tiempo real**: streams **SSE** para corridas y cola de descargas, **skeleton loaders** durante carga, estados vacíos accionables y estados de error explícitos con código HTTP y botón *"Reintentar"*.

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
