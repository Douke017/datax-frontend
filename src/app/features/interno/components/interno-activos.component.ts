import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { PredefinedViewMetadata, PredefinedViewResult, GoldDimensions } from '../../../core/models/analytics.model';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';

interface DataColumnDefinition {
  name: string;
  dataType: string;
  role: 'Clave Dimensión' | 'Partición' | 'Métrica Numérica' | 'Linaje Criptográfico' | 'Auditoría ETL';
  description: string;
  isNullable: boolean;
}

const DATA_DICTIONARY_COLUMNS: DataColumnDefinition[] = [
  {
    name: 'institucion_id',
    dataType: 'VARCHAR',
    role: 'Clave Dimensión',
    description: 'Código alfanumérico normalizado de la entidad emisora (ej. CRECER, DIACONIA, PRO_MUJER)',
    isNullable: false
  },
  {
    name: 'institucion_nombre',
    dataType: 'VARCHAR',
    role: 'Clave Dimensión',
    description: 'Denominación oficial completa de la entidad o emisor del reporte',
    isNullable: false
  },
  {
    name: 'gestion',
    dataType: 'INTEGER',
    role: 'Partición',
    description: 'Año calendario del reporte procesado (Clave primaria de partición física en Parquet)',
    isNullable: false
  },
  {
    name: 'mes',
    dataType: 'INTEGER',
    role: 'Partición',
    description: 'Mes de corte de la información numérica (1 a 12, subpartición física en Parquet)',
    isNullable: false
  },
  {
    name: 'cartera_bruta',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Volumen consolidado de cartera de colocaciones extraído del reporte fuente',
    isNullable: true
  },
  {
    name: 'cartera_vigente',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Colocaciones activas con cumplimiento regular de cronograma',
    isNullable: true
  },
  {
    name: 'cartera_vencida',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Colocaciones con amortización impaga fuera del plazo pactado',
    isNullable: true
  },
  {
    name: 'cartera_en_ejecucion',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Colocaciones en proceso formal de cobranza judicial',
    isNullable: true
  },
  {
    name: 'cartera_en_mora',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Sumatoria total de colocaciones vencidas y en ejecución',
    isNullable: true
  },
  {
    name: 'prevision_cartera',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Fondo de cobertura técnica preventiva asignado en el balance',
    isNullable: true
  },
  {
    name: 'total_activo',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Valor total consolidado de los activos declarados en el estado financiero',
    isNullable: true
  },
  {
    name: 'total_pasivo',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Valor total consolidado de las obligaciones y pasivos exigibles',
    isNullable: true
  },
  {
    name: 'total_patrimonio',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Valor total consolidado del patrimonio neto institucional',
    isNullable: true
  },
  {
    name: 'source_file_sha256',
    dataType: 'VARCHAR(64)',
    role: 'Linaje Criptográfico',
    description: 'Firma digital SHA-256 del archivo inmutable resguardado en Capa Bronze del cual se extrajo este registro',
    isNullable: false
  },
  {
    name: 'transformed_at',
    dataType: 'TIMESTAMP',
    role: 'Auditoría ETL',
    description: 'Timestamp UTC en que el pipeline procesó y consolidó el registro en Capa Gold',
    isNullable: false
  }
];

@Component({
  selector: 'app-interno-activos',
  standalone: true,
  imports: [CommonModule, KpiCardComponent],
  template: `
    <div class="activos-container">
      <!-- Context Header -->
      <div class="activos-header-card">
        <div class="header-main">
          <div class="header-titles">
            <div class="badge-row">
              <span class="badge-gold">CAPA GOLD / DATAMARTS PARQUET</span>
              <span class="badge-olap">DUCKDB VECTORIZADO</span>
            </div>
            <h1 class="header-title">Catálogo Técnico de Activos de Datos y Autoservicio</h1>
            <p class="header-desc">
              Inventario técnico de datamarts consolidados en Apache Parquet, documentación de metadatos,
              diccionarios de esquemas y disponibilización de consultas vectorizadas con extracción autónoma en CSV/JSON.
            </p>
          </div>

          <div class="header-actions">
            <button
              type="button"
              class="btn-secondary"
              (click)="materializeDatamart()"
              [disabled]="materializing() || loadingData()"
              title="Materializa y consolida las transformaciones hacia los archivos Parquet en Capa Gold"
            >
              @if (materializing()) {
                <span>Consolidando Datamarts...</span>
              } @else {
                <span>Materializar Capa Gold</span>
              }
            </button>
            <button
              type="button"
              class="btn-primary"
              (click)="refreshCurrentView()"
              [disabled]="loadingData() || materializing()"
            >
              @if (loadingData()) {
                <span>Consultando DuckDB...</span>
              } @else {
                <span>Ejecutar Consulta Vectorizada</span>
              }
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="activos-nav-tabs">
          <button
            type="button"
            class="nav-tab"
            [class.active]="activeSubTab() === 'explorer'"
            (click)="activeSubTab.set('explorer')"
          >
            <span class="tab-title">Consola de Autoservicio y Disponibilización (Objetivos 2 y 4)</span>
            <span class="tab-badge">DUCKDB OLAP</span>
          </button>
          <button
            type="button"
            class="nav-tab"
            [class.active]="activeSubTab() === 'dictionary'"
            (click)="activeSubTab.set('dictionary')"
          >
            <span class="tab-title">Inventario Técnico y Diccionario de Datos (Objetivo 3)</span>
            <span class="tab-badge">{{ dictionaryColumns.length }} Campos</span>
          </button>
        </div>
      </div>

      <!-- TAB 1: CONSOLA DE AUTOSERVICIO Y DISPONIBILIZACIÓN -->
      @if (activeSubTab() === 'explorer') {
        <!-- Technical Query Controls -->
        <div class="controls-card">
          <div class="controls-grid">
            <div class="control-item">
              <label class="control-lbl" for="sel-inst">Entidad Emisora:</label>
              <select
                id="sel-inst"
                class="select-control"
                [value]="selectedInstitution()"
                (change)="onInstitutionChange($event)"
              >
                <option value="">Todas las Entidades (Sin filtro)</option>
                @for (inst of (dimensions()?.instituciones || dimensions()?.institutions || []); track inst) {
                  <option [value]="inst">{{ inst }}</option>
                }
              </select>
            </div>

            <div class="control-item">
              <label class="control-lbl" for="sel-gestion">Gestión (Partición):</label>
              <select
                id="sel-gestion"
                class="select-control"
                [value]="selectedGestion() ?? ''"
                (change)="onGestionChange($event)"
              >
                <option value="">Todas las Gestiones</option>
                @for (g of dimensions()?.gestiones || []; track g) {
                  <option [value]="g">{{ g }}</option>
                }
              </select>
            </div>

            <div class="control-item">
              <label class="control-lbl" for="sel-mes">Mes (Partición):</label>
              <select
                id="sel-mes"
                class="select-control"
                [value]="selectedMes() ?? ''"
                (change)="onMesChange($event)"
              >
                <option value="">Todos los Meses</option>
                @for (m of dimensions()?.meses || []; track m) {
                  <option [value]="m">Mes {{ m }}</option>
                }
              </select>
            </div>

            <div class="control-item">
              <label class="control-lbl" for="sel-limit">Límite de Filas:</label>
              <select
                id="sel-limit"
                class="select-control"
                [value]="resultLimit()"
                (change)="onLimitChange($event)"
              >
                <option [value]="25">25 Registros</option>
                <option [value]="50">50 Registros</option>
                <option [value]="100">100 Registros</option>
              </select>
            </div>

            <div class="control-item filter-btn-col">
              <button
                type="button"
                class="btn-query"
                (click)="refreshCurrentView()"
                [disabled]="loadingData()"
              >
                Filtrar Datamart
              </button>
            </div>
          </div>
        </div>

        <!-- Engineering Performance KPIs -->
        <div class="kpi-grid">
          <app-kpi-card
            title="Latencia DuckDB"
            [value]="viewResult()?.execution_time_ms ? (viewResult()!.execution_time_ms.toFixed(1) + ' ms') : '0.0 ms'"
            subtitle="Tiempo de ejecución analítica en memoria"
            tone="success"
            badgeText="OLAP SPEED"
          />
          <app-kpi-card
            title="Registros Extraídos"
            [value]="viewResult()?.total_records || 0"
            subtitle="Filas estructuradas recuperadas"
            tone="info"
            badgeText="VOLUMEN"
          />
          <app-kpi-card
            title="Columnas del Esquema"
            [value]="(viewResult()?.columns?.length || 0) + ' campos'"
            subtitle="Ancho de proyección tabular"
            tone="purple"
            badgeText="ESQUEMA"
          />
          <app-kpi-card
            title="Almacenamiento Físico"
            value="Apache Parquet"
            subtitle="Capa Gold particionada (Snappy)"
            tone="default"
            badgeText="FORMATO"
          />
        </div>

        <!-- Structured Data Matrix with Autonomous Extraction -->
        <div class="section-card">
          <div class="section-header">
            <div>
              <h2 class="section-title">Matriz de Datos Procesados (Datamart Capa Gold)</h2>
              <p class="section-desc">
                Data columnar limpia consultada directamente desde archivos Parquet mediante motor DuckDB en memoria.
              </p>
            </div>

            <div class="export-actions">
              <button
                type="button"
                class="btn-export"
                (click)="exportToCsv()"
                [disabled]="!viewResult()?.records?.length"
                title="Descargar dataset en formato CSV para herramientas de análisis (Pandas, R, Jupyter)"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                class="btn-export"
                (click)="exportToJson()"
                [disabled]="!viewResult()?.records?.length"
                title="Descargar dataset en formato JSON estructurado"
              >
                Exportar JSON
              </button>
              <div class="records-badge mono">
                {{ viewResult()?.records?.length || 0 }} filas
              </div>
            </div>
          </div>

          <!-- Clean Neutral Data Table -->
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  @for (col of viewResult()?.columns || []; track col) {
                    <th [class.th-num]="isNumericCol(col)">{{ col }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of viewResult()?.records || []; track $index) {
                  <tr>
                    @for (col of viewResult()?.columns || []; track col) {
                      <td [class.td-num]="isNumericCol(col)">
                        @if (col === 'source_file_sha256') {
                          <span class="hash-tag mono" [title]="row[col]">{{ row[col] | slice:0:16 }}...</span>
                        } @else if (col === 'institucion_id') {
                          <span class="id-tag mono">{{ row[col] }}</span>
                        } @else if (col === 'gestion' || col === 'mes') {
                          <span class="mono">{{ row[col] }}</span>
                        } @else if (isNumericCol(col)) {
                          <span class="mono num-text">{{ formatNumber(row[col]) }}</span>
                        } @else {
                          <span>{{ row[col] ?? '-' }}</span>
                        }
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="viewResult()?.columns?.length || 5" class="empty-state">
                      @if (loadingData()) {
                        <span>Consultando datamart en memoria con DuckDB...</span>
                      } @else {
                        <span>No se encontraron registros para los filtros seleccionados.</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- TAB 2: INVENTARIO TÉCNICO Y DICCIONARIO DE DATOS -->
      @if (activeSubTab() === 'dictionary') {
        <!-- Datamart Metadata Overview Card -->
        <div class="metadata-card">
          <div class="meta-header">
            <span class="meta-tag mono">METADATOS DE CAPA GOLD</span>
            <h2 class="meta-title">Inventario Técnico del Datamart: mart_cartera</h2>
            <p class="meta-desc">
              Especificación técnica, almacenamiento optimizado y linaje criptográfico con los archivos fuente de Capa Bronze.
            </p>
          </div>

          <div class="meta-specs-grid">
            <div class="spec-box">
              <span class="spec-label">Formato de Archivo</span>
              <span class="spec-val mono">Apache Parquet (.parquet)</span>
              <span class="spec-sub">Almacenamiento columnar de alto rendimiento</span>
            </div>
            <div class="spec-box">
              <span class="spec-label">Motor de Consulta OLAP</span>
              <span class="spec-val mono">DuckDB en memoria</span>
              <span class="spec-sub">Ejecución vectorizada en &lt;20ms</span>
            </div>
            <div class="spec-box">
              <span class="spec-label">Claves de Partición Física</span>
              <span class="spec-val mono">gestion / mes</span>
              <span class="spec-sub">Particionado jerárquico en disco</span>
            </div>
            <div class="spec-box">
              <span class="spec-label">Linaje Criptográfico</span>
              <span class="spec-val mono">source_file_sha256</span>
              <span class="spec-sub">Firma SHA-256 única por archivo original</span>
            </div>
          </div>
        </div>

        <!-- Column Dictionary Table -->
        <div class="section-card">
          <div class="section-header">
            <div>
              <h2 class="section-title">Diccionario Técnico de Campos y Esquema de Datos</h2>
              <p class="section-desc">
                Definición formal de columnas, tipos primitivos, roles analíticos y nulabilidad para integración de datos.
              </p>
            </div>
            <div class="records-badge mono">
              {{ dictionaryColumns.length }} campos documentados
            </div>
          </div>

          <div class="table-container">
            <table class="dict-table">
              <thead>
                <tr>
                  <th>Nombre de Campo</th>
                  <th>Tipo de Dato</th>
                  <th>Rol en Esquema</th>
                  <th>Descripción Técnica</th>
                  <th>Nulable</th>
                </tr>
              </thead>
              <tbody>
                @for (c of dictionaryColumns; track c.name) {
                  <tr>
                    <td class="td-col-name">
                      <span class="col-name mono">{{ c.name }}</span>
                    </td>
                    <td>
                      <span class="type-badge mono">{{ c.dataType }}</span>
                    </td>
                    <td>
                      <span class="role-badge" [class]="'role-' + c.role.toLowerCase().replace(' ', '-')">
                        {{ c.role }}
                      </span>
                    </td>
                    <td class="td-col-desc">{{ c.description }}</td>
                    <td class="td-col-null mono">{{ c.isNullable ? 'SÍ' : 'NO' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .activos-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .activos-header-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      flex-wrap: wrap;
    }
    .header-titles {
      max-width: 780px;
    }
    .badge-row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .system-tag {
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .badge-gold {
      font-size: 11px;
      font-weight: 700;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .badge-olap {
      font-size: 11px;
      font-weight: 700;
      color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .header-title {
      font-size: 22px;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 6px 0;
    }
    .header-desc {
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-muted);
      margin: 0;
    }
    .header-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn-primary {
      padding: 9px 18px;
      background: #3b82f6;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      padding: 9px 16px;
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-main);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-secondary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: #64748b;
    }
    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .activos-nav-tabs {
      display: flex;
      gap: 12px;
      border-top: 1px solid var(--border-subtle);
      padding-top: 16px;
      flex-wrap: wrap;
    }
    .nav-tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.15s ease;
    }
    .nav-tab:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.03);
    }
    .nav-tab.active {
      color: #ffffff;
      background: rgba(59, 130, 246, 0.15);
      border-color: #3b82f6;
    }
    .tab-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.08);
      color: inherit;
    }

    .controls-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px 20px;
    }
    .controls-grid {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      flex-wrap: wrap;
    }
    .control-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 170px;
    }
    .filter-btn-col {
      min-width: auto;
    }
    .control-lbl {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .select-control {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 7px 10px;
      color: var(--text-main);
      font-size: 12px;
      outline: none;
    }
    .select-control:focus {
      border-color: #3b82f6;
    }
    .btn-query {
      padding: 8px 16px;
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid #3b82f6;
      border-radius: 6px;
      color: #93c5fd;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-query:hover:not(:disabled) {
      background: #3b82f6;
      color: #ffffff;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .section-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .section-title {
      font-size: 16px;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 4px 0;
    }
    .section-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0;
    }
    .export-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn-export {
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 700;
      color: #93c5fd;
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-export:hover:not(:disabled) {
      background: rgba(59, 130, 246, 0.25);
      border-color: #3b82f6;
      color: #ffffff;
    }
    .btn-export:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .records-badge {
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 4px 10px;
      border-radius: 12px;
    }

    .table-container {
      overflow-x: auto;
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
    }
    .data-table, .dict-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .data-table th, .dict-table th {
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-subtle);
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.04em;
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border-subtle);
      white-space: nowrap;
    }
    .data-table td, .dict-table td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-main);
      white-space: nowrap;
    }
    .th-num, .td-num {
      text-align: right !important;
    }
    .num-text {
      color: #e2e8f0;
    }
    .hash-tag {
      font-size: 11px;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.04);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .id-tag {
      font-size: 11px;
      font-weight: 700;
      color: #60a5fa;
      background: rgba(59, 130, 246, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .empty-state {
      padding: 32px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
    }

    /* Dictionary Tab Styles */
    .metadata-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .meta-tag {
      font-size: 11px;
      font-weight: 700;
      color: #f59e0b;
      letter-spacing: 0.04em;
    }
    .meta-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--text-main);
      margin: 4px 0 6px 0;
    }
    .meta-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
    }
    .meta-specs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }
    .spec-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .spec-label {
      font-size: 11px;
      color: var(--text-subtle);
      text-transform: uppercase;
      font-weight: 600;
    }
    .spec-val {
      font-size: 13px;
      font-weight: 700;
      color: #38bdf8;
    }
    .spec-sub {
      font-size: 11px;
      color: var(--text-muted);
    }
    .td-col-name .col-name {
      font-weight: 700;
      color: #93c5fd;
    }
    .type-badge {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
      color: #a7f3d0;
    }
    .role-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-muted);
    }
    .td-col-desc {
      max-width: 400px;
      white-space: normal !important;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-muted);
    }
    .td-col-null {
      font-size: 11px;
      color: var(--text-subtle);
    }
  `]
})
export class InternoActivosComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);

  readonly activeSubTab = signal<'explorer' | 'dictionary'>('explorer');
  readonly dimensions = signal<GoldDimensions | null>(null);
  readonly selectedInstitution = signal<string>('');
  readonly selectedGestion = signal<number | null>(null);
  readonly selectedMes = signal<number | null>(null);
  readonly resultLimit = signal<number>(50);

  readonly viewResult = signal<PredefinedViewResult | null>(null);
  readonly loadingData = signal<boolean>(false);
  readonly materializing = signal<boolean>(false);

  readonly dictionaryColumns = DATA_DICTIONARY_COLUMNS;

  ngOnInit(): void {
    this.loadDimensions();
    this.refreshCurrentView();
  }

  loadDimensions(): void {
    this.analyticsService.getDimensions().subscribe({
      next: (dims) => this.dimensions.set(dims),
      error: () => {}
    });
  }

  onInstitutionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedInstitution.set(val);
  }

  onGestionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedGestion.set(val ? Number(val) : null);
  }

  onMesChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedMes.set(val ? Number(val) : null);
  }

  onLimitChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.resultLimit.set(val);
  }

  refreshCurrentView(): void {
    this.loadingData.set(true);

    const req = {
      institutions: this.selectedInstitution() ? [this.selectedInstitution()] : undefined,
      gestion: this.selectedGestion() ?? undefined,
      mes: this.selectedMes() ?? undefined,
      limit: this.resultLimit()
    };

    // Usar la vista multidimensional de Capa Gold
    this.analyticsService.executePredefinedView('ranking-solvencia-cobertura', req).subscribe({
      next: (res) => {
        this.viewResult.set(res);
        this.loadingData.set(false);
      },
      error: () => {
        this.loadingData.set(false);
      }
    });
  }

  materializeDatamart(): void {
    this.materializing.set(true);
    this.analyticsService.materializeGold().subscribe({
      next: () => {
        this.materializing.set(false);
        this.loadDimensions();
        this.refreshCurrentView();
      },
      error: () => {
        this.materializing.set(false);
      }
    });
  }

  isNumericCol(col: string): boolean {
    return (
      col.includes('cartera') ||
      col.includes('total') ||
      col.includes('activo') ||
      col.includes('pasivo') ||
      col.includes('patrimonio') ||
      col.includes('prevision') ||
      col.includes('ratio') ||
      col === 'gestion' ||
      col === 'mes'
    );
  }

  formatNumber(val: any): string {
    if (typeof val !== 'number') return String(val ?? '-');
    return val.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  exportToCsv(): void {
    const res = this.viewResult();
    if (!res || !res.records || !res.records.length) return;
    const cols = res.columns;
    const header = cols.join(',');
    const rows = res.records.map((r) =>
      cols.map((c) => {
        const val = r[c];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      }).join(',')
    );
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `datax_gold_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToJson(): void {
    const res = this.viewResult();
    if (!res || !res.records || !res.records.length) return;
    const jsonStr = JSON.stringify(res.records, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `datax_gold_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
