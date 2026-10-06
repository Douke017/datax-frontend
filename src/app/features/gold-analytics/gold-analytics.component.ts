import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';
import { InstitutionStateService } from '../../core/services/institution-state.service';
import {
  PredefinedViewMetadata,
  PredefinedViewResult,
  FinancialMetricDefinition,
  GoldDimensions,
  MaterializeGoldResponse
} from '../../core/models/analytics.model';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';

@Component({
  selector: 'app-gold-analytics',
  standalone: true,
  imports: [CommonModule, KpiCardComponent],
  template: `
    <div class="analytics-page">
      <!-- Institutional Header -->
      <div class="page-header">
        <div>
          <div class="badge-row">
            <span class="source-tag">SUPERVISIÓN FINANCIERA</span>
            <span class="consolidated-badge">INFORMACIÓN CONSOLIDADA</span>
            <span class="regulated-badge">ENTIDADES REGULADAS</span>
          </div>
          <h1 class="page-title">Supervisión de Cartera y Solvencia</h1>
          <p class="page-desc">
            Monitoreo del desempeño financiero, calidad de cartera y marco normativo de las instituciones supervisadas.
          </p>
        </div>

        <div class="header-actions">
          <button
            class="btn-secondary"
            (click)="materializeDatamart()"
            [disabled]="materializing() || loadingData()"
            title="Sincroniza y consolida la información a partir de las publicaciones auditadas"
          >
            @if (materializing()) {
              <span>Consolidando Información...</span>
            } @else {
              <span>Sincronizar Información Contable</span>
            }
          </button>

          <button
            class="btn-primary"
            (click)="refreshCurrentView()"
            [disabled]="loadingData() || materializing()"
          >
            @if (loadingData()) {
              <span>Consultando...</span>
            } @else {
              <span>Actualizar Indicadores</span>
            }
          </button>
        </div>
      </div>

      <!-- Financial synchronization notification banner -->
      @if (lastMaterialization(); as mat) {
        <div class="mat-banner">
          <div class="mat-tag">INFORMACIÓN CONTABLE ACTUALIZADA</div>
          <div class="mat-content">
            <span class="mat-stat"><strong>{{ mat.total_bronze_artifacts }}</strong> publicaciones procesadas</span>
            <span class="mat-sep">·</span>
            <span class="mat-stat"><strong>{{ mat.total_silver_records }}</strong> registros contables depurados</span>
            <span class="mat-sep">·</span>
            <span class="mat-stat"><strong>{{ mat.total_gold_records }}</strong> estados consolidados</span>
          </div>
          <button class="btn-dismiss" (click)="lastMaterialization.set(null)">Cerrar</button>
        </div>
      }

      <!-- Main Navigation Tabs -->
      <div class="nav-tabs-bar">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'views'"
          (click)="activeTab.set('views')"
        >
          Evaluación de Cartera y Solvencia
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'dictionary'"
          (click)="activeTab.set('dictionary')"
        >
          Catálogo Normativo de Indicadores
        </button>
      </div>

      <!-- TAB 1: EVALUACIÓN DE CARTERA Y SOLVENCIA -->
      @if (activeTab() === 'views') {
        <!-- Institutional View Selector -->
        <div class="view-selector-bar">
          <span class="selector-label">ENFOQUE DE SUPERVISIÓN:</span>
          <div class="views-pills">
            @for (v of availableViews(); track v.view_id) {
              <button
                class="view-pill"
                [class.active]="selectedViewId() === v.view_id"
                (click)="selectView(v.view_id)"
              >
                <span class="pill-category" [class]="'cat-' + v.category.toLowerCase()">
                  {{ v.category }}
                </span>
                <span class="pill-title">{{ v.title }}</span>
              </button>
            }
          </div>
        </div>

        <!-- View Context Summary Card -->
        @if (currentViewMeta(); as meta) {
          <div class="view-info-card">
            <div class="view-info-header">
              <span class="view-meta-title">{{ meta.title }}</span>
            </div>
            <p class="view-meta-desc">{{ meta.description }}</p>
          </div>
        }

        <!-- Filter Controls -->
        <div class="controls-bar">
          <div class="control-item">
            <span class="control-lbl">Entidad Regulada:</span>
            <select
              class="select-input"
              [value]="selectedInstitution()"
              (change)="onInstitutionChange($event)"
            >
              <option value="">Todas las Entidades (8 IFDs)</option>
              @for (inst of (dimensions()?.instituciones || dimensions()?.institutions || []); track inst) {
                <option [value]="inst">{{ inst }}</option>
              }
            </select>
          </div>

          <div class="control-item">
            <span class="control-lbl">Gestión:</span>
            <select
              class="select-input"
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
            <span class="control-lbl">Mes:</span>
            <select
              class="select-input"
              [value]="selectedMes() ?? ''"
              (change)="onMesChange($event)"
            >
              <option value="">Todos los Meses</option>
              @for (m of dimensions()?.meses || []; track m) {
                <option [value]="m">Mes {{ m }} ({{ getMonthName(m) }})</option>
              }
            </select>
          </div>

          <div class="control-item">
            <span class="control-lbl">Registros:</span>
            <select
              class="select-input"
              [value]="resultLimit()"
              (change)="onLimitChange($event)"
            >
              <option [value]="25">25 Filas</option>
              <option [value]="50">50 Filas</option>
              <option [value]="100">100 Filas</option>
            </select>
          </div>

          <div class="control-item run-action">
            <button
              class="btn-primary btn-sm"
              (click)="refreshCurrentView()"
              [disabled]="loadingData()"
            >
              Consultar
            </button>
          </div>
        </div>

        <!-- Macro Financial Indicators (KPIs) -->
        <div class="kpi-grid">
          <app-kpi-card
            title="Tiempo de Respuesta"
            [value]="viewResult()?.execution_time_ms ? (viewResult()!.execution_time_ms.toFixed(1) + ' ms') : '0.0 ms'"
            subtitle="Consulta analítica institucional"
            tone="success"
            badgeText="SISTEMA"
          />
          <app-kpi-card
            title="Registros Analizados"
            [value]="viewResult()?.total_records || 0"
            subtitle="Cortes contables evaluados en la muestra"
            tone="info"
            badgeText="MUESTRA"
          />
          <app-kpi-card
            title="Cartera Supervisada"
            [value]="computedTotalCartera()"
            subtitle="Volumen de colocaciones en los registros evaluados"
            tone="purple"
            badgeText="CAPITAL"
          />
          <app-kpi-card
            title="Ratio Mora Ponderado"
            [value]="computedAvgMora()"
            subtitle="Proporción promedio de cartera en mora"
            [tone]="computedAvgMoraTone()"
            badgeText="RIESGO CREDITICIO"
          />
        </div>

        <!-- Comparative Institutional Ranking -->
        @if (selectedViewId() === 'ranking-solvencia-cobertura' && viewResult()?.records?.length) {
          <div class="section-card">
            <div class="section-header">
              <h2 class="section-title">Ranking Institucional de Cobertura de Previsiones</h2>
              <span class="section-badge">Múltiplo Previsiones / Mora</span>
            </div>
            <div class="ranking-bars-list">
              @for (r of viewResult()!.records; track r['institucion_id'] || r['institucion']; let i = $index) {
                <div class="ranking-item">
                  <div class="ranking-header">
                    <div class="ranking-name-row">
                      <span class="rank-pos">#{{ i + 1 }}</span>
                      <span class="rank-inst">{{ r['institucion_nombre'] || r['institucion_id'] || r['institucion'] }}</span>
                      <span class="rank-period mono">{{ r['gestion'] }}-{{ r['mes'] < 10 ? '0' + r['mes'] : r['mes'] }}</span>
                    </div>
                    <div class="ranking-values">
                      <span class="cobertura-tag">Cobertura: <strong>{{ formatDecimal(r['ratio_cobertura']) }}x</strong></span>
                      <span class="mora-tag">Mora: <strong>{{ formatCurrency(r['cartera_en_mora']) }}</strong></span>
                    </div>
                  </div>
                  <div class="rank-bar-bg">
                    <div
                      class="rank-bar-fill"
                      [style.width.%]="getCoberturaPercentage(r['ratio_cobertura'])"
                    ></div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Financial Data Matrix -->
        <div class="section-card">
          <div class="section-header">
            <div>
              <h2 class="section-title">Matriz de Indicadores Financieros</h2>
              <p class="section-desc">
                Información contable extraída de publicaciones oficiales auditadas.
              </p>
            </div>
            <div class="inventory-badge">
              {{ viewResult()?.records?.length || 0 }} registros recuperados
            </div>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  @for (col of viewResult()?.columns || []; track col) {
                    <th [style.text-align]="isNumericCol(col) ? 'right' : 'left'">
                      {{ formatColumnHeader(col) }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of viewResult()?.records || []; track $index) {
                  <tr>
                    @for (col of viewResult()?.columns || []; track col) {
                      <td [style.text-align]="isNumericCol(col) ? 'right' : 'left'">
                        @if (col === 'institucion' || col === 'institucion_nombre') {
                          <span class="inst-cell">{{ row[col] }}</span>
                        } @else if (col === 'institucion_id') {
                          <span class="id-tag mono">{{ row[col] }}</span>
                        } @else if (col === 'gestion' || col === 'mes') {
                          <span class="mono">{{ row[col] }}</span>
                        } @else if (isCurrencyCol(col)) {
                          <span class="mono currency-text">{{ formatCurrency(row[col]) }}</span>
                        } @else if (isPercentCol(col)) {
                          <span class="mono" [class]="getMoraClass(row[col])">{{ formatPercent(row[col]) }}</span>
                        } @else if (isRatioCol(col)) {
                          <span class="mono ratio-text">{{ formatDecimal(row[col]) }}x</span>
                        } @else {
                          <span>{{ row[col] }}</span>
                        }
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="viewResult()?.columns?.length || 5" class="empty-state">
                      @if (loadingData()) {
                        <span>Consultando indicadores contables...</span>
                      } @else {
                        <span>No se encontraron registros para los filtros seleccionados. Pruebe ampliando el rango o sincronizando la información.</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- TAB 2: CATÁLOGO NORMATIVO DE INDICADORES -->
      @if (activeTab() === 'dictionary') {
        <!-- Category & Search Controls -->
        <div class="dict-filter-bar">
          <div class="category-pills">
            @for (cat of dictCategories(); track cat) {
              <button
                class="cat-pill"
                [class.active]="selectedCategory() === cat"
                (click)="selectedCategory.set(cat)"
              >
                {{ cat }}
              </button>
            }
          </div>

          <div class="dict-search">
            <input
              type="text"
              class="search-input"
              placeholder="Buscar indicador por nombre o regla de negocio..."
              [value]="dictSearchTerm()"
              (input)="onDictSearchInput($event)"
            />
          </div>
        </div>

        <!-- Metrics Cards Grid -->
        <div class="metrics-grid">
          @for (metric of filteredMetrics(); track metric.metric_code) {
            <div class="metric-card">
              <div class="metric-card-header">
                <div class="metric-badges">
                  <span class="cat-tag" [class]="'cat-' + metric.category.toLowerCase()">
                    {{ metric.category }}
                  </span>
                  <span class="type-tag mono">{{ metric.data_type }}</span>
                </div>
                <span class="metric-code mono">{{ metric.metric_code }}</span>
              </div>

              <h3 class="metric-title">{{ metric.canonical_name }}</h3>
              <p class="metric-desc">{{ metric.description }}</p>

              <!-- Calculation Rule Box -->
              <div class="formula-box">
                <span class="formula-lbl">BASE DE CÁLCULO NORMATIVA:</span>
                <code class="formula-text mono">{{ metric.formula_latex }}</code>
              </div>

              <div class="metric-footer">
                <div class="footer-meta">
                  <span class="meta-label">Unidad de Medida:</span>
                  <span class="meta-value">{{ metric.unit }}</span>
                </div>
                <div class="footer-meta">
                  <span class="meta-label">Campos Fuente:</span>
                  <div class="fields-list">
                    @for (f of metric.required_fields; track f) {
                      <span class="field-pill mono">{{ f }}</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          } @empty {
            <div class="empty-state-full">
              <span>No se encontraron indicadores normativos coincidentes con el criterio de búsqueda.</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .analytics-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }
    .badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }
    .source-tag {
      background: var(--bg-surface-elevated);
      color: #93c5fd;
      border: 1px solid var(--border-medium);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 700;
    }
    .consolidated-badge {
      font-size: 10px;
      font-weight: 700;
      color: #fbbf24;
      background: var(--warning-bg);
      border: 1px solid var(--warning-border);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
    }
    .regulated-badge {
      font-size: 10px;
      font-weight: 700;
      color: #34d399;
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
    }
    .page-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
    }
    .page-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .mat-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid var(--success-border);
      border-radius: var(--radius-md);
      padding: 10px 16px;
      font-size: 12px;
      color: var(--text-main);
      gap: 12px;
    }
    .mat-tag {
      font-weight: 800;
      color: #34d399;
      font-size: 11px;
      letter-spacing: 0.05em;
    }
    .mat-content {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .mat-stat strong {
      color: #ffffff;
    }
    .mat-sep {
      color: var(--text-subtle);
    }
    .btn-dismiss {
      background: transparent;
      border: 1px solid var(--border-subtle);
      color: var(--text-subtle);
      font-size: 11px;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .btn-dismiss:hover {
      background: var(--bg-surface-elevated);
      color: var(--text-main);
    }
    .nav-tabs-bar {
      display: flex;
      gap: 10px;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 2px;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: var(--text-main);
    }
    .tab-btn.active {
      color: #60a5fa;
      border-bottom-color: var(--primary);
    }
    .view-selector-bar {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .selector-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-subtle);
      letter-spacing: 0.05em;
    }
    .views-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .view-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .view-pill:hover {
      border-color: var(--border-medium);
      color: var(--text-main);
    }
    .view-pill.active {
      background: var(--bg-surface-elevated);
      border-color: var(--primary);
      color: var(--text-main);
      box-shadow: 0 0 0 1px var(--primary);
    }
    .pill-category {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .cat-riesgo, .cat-cartera {
      background: var(--danger-bg);
      color: #f87171;
      border: 1px solid var(--danger-border);
    }
    .cat-solvencia {
      background: var(--warning-bg);
      color: #fbbf24;
      border: 1px solid var(--warning-border);
    }
    .cat-benchmark, .cat-balance {
      background: var(--info-bg);
      color: #38bdf8;
      border: 1px solid var(--info-border);
    }
    .cat-rentabilidad {
      background: var(--purple-bg);
      color: #c084fc;
      border: 1px solid var(--purple-border);
    }
    .pill-title {
      font-size: 12px;
      font-weight: 600;
    }
    .view-info-card {
      background: rgba(30, 58, 138, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .view-info-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .view-meta-title {
      font-size: 13px;
      font-weight: 700;
      color: #93c5fd;
    }
    .view-meta-desc {
      font-size: 12px;
      color: var(--text-muted);
    }
    .controls-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px 16px;
      flex-wrap: wrap;
    }
    .control-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .control-lbl {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      text-transform: uppercase;
    }
    .select-input {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 6px 10px;
      color: var(--text-main);
      font-size: 12px;
    }
    .select-input:focus {
      outline: none;
      border-color: var(--primary);
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
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }
    .section-badge {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      background: var(--bg-app);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid var(--border-subtle);
    }
    .section-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .inventory-badge {
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 3px 10px;
      border-radius: 12px;
    }
    .ranking-bars-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ranking-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ranking-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .ranking-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .rank-pos {
      font-weight: 800;
      color: #60a5fa;
      width: 24px;
    }
    .rank-inst {
      font-weight: 700;
      color: var(--text-main);
    }
    .rank-period {
      font-size: 11px;
      color: var(--text-subtle);
    }
    .ranking-values {
      display: flex;
      gap: 12px;
      font-size: 11px;
    }
    .cobertura-tag strong {
      color: #34d399;
    }
    .mora-tag strong {
      color: #fbbf24;
    }
    .rank-bar-bg {
      height: 8px;
      background: var(--bg-app);
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
    }
    .rank-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .table-container {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .data-table th {
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      border-bottom: 1px solid var(--border-subtle);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-main);
      vertical-align: middle;
    }
    .inst-cell {
      font-weight: 700;
      color: #93c5fd;
    }
    .id-tag {
      font-size: 11px;
      background: var(--bg-app);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--border-subtle);
      color: #cbd5e1;
    }
    .currency-text {
      color: #cbd5e1;
    }
    .ratio-text {
      font-weight: 700;
      color: #34d399;
    }
    .mora-low {
      color: #34d399;
      font-weight: 600;
    }
    .mora-med {
      color: #fbbf24;
      font-weight: 600;
    }
    .mora-high {
      color: #f87171;
      font-weight: 700;
    }
    .empty-state {
      text-align: center;
      padding: 24px;
      color: var(--text-subtle);
      font-style: italic;
    }

    /* DICTIONARY TAB STYLES */
    .dict-filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .category-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .cat-pill {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .cat-pill:hover {
      border-color: var(--border-medium);
      color: var(--text-main);
    }
    .cat-pill.active {
      background: var(--primary);
      border-color: var(--primary);
      color: #ffffff;
    }
    .dict-search {
      flex: 1;
      max-width: 380px;
      min-width: 240px;
    }
    .search-input {
      width: 100%;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 8px 12px;
      color: var(--text-main);
      font-size: 12px;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--primary);
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 16px;
    }
    .metric-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.15s ease;
    }
    .metric-card:hover {
      border-color: var(--border-medium);
    }
    .metric-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-badges {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .cat-tag {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.05em;
    }
    .type-tag {
      font-size: 9px;
      color: var(--text-subtle);
      background: var(--bg-app);
      padding: 2px 5px;
      border-radius: 3px;
    }
    .metric-code {
      font-size: 11px;
      color: #a78bfa;
      background: rgba(167, 139, 250, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .metric-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
    }
    .metric-desc {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .formula-box {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .formula-lbl {
      font-size: 9px;
      font-weight: 700;
      color: var(--text-subtle);
      letter-spacing: 0.05em;
    }
    .formula-text {
      font-size: 11px;
      color: #38bdf8;
      word-break: break-all;
    }
    .metric-footer {
      border-top: 1px solid var(--border-subtle);
      padding-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 11px;
    }
    .footer-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .meta-label {
      color: var(--text-subtle);
      font-weight: 600;
    }
    .meta-value {
      color: var(--text-main);
    }
    .fields-list {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .field-pill {
      font-size: 10px;
      background: var(--bg-surface-elevated);
      color: #93c5fd;
      padding: 1px 5px;
      border-radius: 3px;
    }
    .empty-state-full {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px;
      color: var(--text-subtle);
      font-style: italic;
    }
  `]
})
export class GoldAnalyticsComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  readonly instState = inject(InstitutionStateService);

  readonly activeTab = signal<'views' | 'dictionary'>('views');
  readonly availableViews = signal<PredefinedViewMetadata[]>([]);
  readonly selectedViewId = signal<string>('ranking-solvencia-cobertura');
  readonly dimensions = signal<GoldDimensions | null>(null);

  // Filters
  readonly selectedInstitution = signal<string>('');
  readonly selectedGestion = signal<number | null>(null);
  readonly selectedMes = signal<number | null>(null);
  readonly resultLimit = signal<number>(50);

  // Execution result
  readonly viewResult = signal<PredefinedViewResult | null>(null);
  readonly loadingData = signal<boolean>(false);
  readonly materializing = signal<boolean>(false);
  readonly lastMaterialization = signal<MaterializeGoldResponse | null>(null);

  // Semantic dictionary
  readonly allMetrics = signal<FinancialMetricDefinition[]>([]);
  readonly dictCategories = signal<string[]>(['TODAS']);
  readonly selectedCategory = signal<string>('TODAS');
  readonly dictSearchTerm = signal<string>('');

  readonly currentViewMeta = computed(() => {
    return this.availableViews().find((v) => v.view_id === this.selectedViewId()) || null;
  });

  readonly filteredMetrics = computed(() => {
    const list = this.allMetrics();
    const cat = this.selectedCategory();
    const term = this.dictSearchTerm().toLowerCase().trim();

    return list.filter((m) => {
      const matchCat = cat === 'TODAS' || m.category.toUpperCase() === cat.toUpperCase();
      const matchTerm =
        !term ||
        m.canonical_name.toLowerCase().includes(term) ||
        m.metric_code.toLowerCase().includes(term) ||
        m.description.toLowerCase().includes(term);
      return matchCat && matchTerm;
    });
  });

  readonly computedTotalCartera = computed(() => {
    const res = this.viewResult();
    if (!res || !res.records.length) return '0,00 M Bs.';
    let total = 0;
    for (const r of res.records) {
      if (typeof r['cartera_bruta'] === 'number') {
        total += r['cartera_bruta'];
      }
    }
    const millions = total / 1_000_000;
    return `${millions.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M Bs.`;
  });

  readonly computedAvgMora = computed(() => {
    const res = this.viewResult();
    if (!res || !res.records.length) return '0,00%';
    let sum = 0;
    let count = 0;
    for (const r of res.records) {
      const val = r['ratio_mora'] ?? r['mora_pct'];
      if (typeof val === 'number') {
        const pct = val <= 1.0 ? val * 100 : val;
        sum += pct;
        count++;
      }
    }
    if (count === 0) return 'N/A';
    return (sum / count).toFixed(2) + '%';
  });

  readonly computedAvgMoraTone = computed<'default' | 'success' | 'warning' | 'danger'>(() => {
    const res = this.viewResult();
    if (!res || !res.records.length) return 'default';
    let sum = 0;
    let count = 0;
    for (const r of res.records) {
      const val = r['ratio_mora'] ?? r['mora_pct'];
      if (typeof val === 'number') {
        const pct = val <= 1.0 ? val * 100 : val;
        sum += pct;
        count++;
      }
    }
    if (count === 0) return 'default';
    const avg = sum / count;
    if (avg < 2.0) return 'success';
    if (avg < 4.0) return 'warning';
    return 'danger';
  });

  ngOnInit(): void {
    this.loadCatalogAndDimensions();
    this.loadSemanticDictionary();
  }

  loadCatalogAndDimensions(): void {
    this.analyticsService.getDimensions().subscribe({
      next: (dims) => {
        this.dimensions.set(dims);
      },
      error: () => {}
    });

    this.analyticsService.getPredefinedViews().subscribe({
      next: (views) => {
        this.availableViews.set(views);
        if (views.length > 0 && !this.selectedViewId()) {
          this.selectedViewId.set(views[0].view_id);
        }
        this.refreshCurrentView();
      },
      error: () => {}
    });
  }

  loadSemanticDictionary(): void {
    this.analyticsService.getSemanticMetrics().subscribe({
      next: (data) => {
        this.allMetrics.set(data.metrics);
        this.dictCategories.set(['TODAS', ...data.categories]);
      },
      error: () => {}
    });
  }

  selectView(viewId: string): void {
    this.selectedViewId.set(viewId);
    this.refreshCurrentView();
  }

  refreshCurrentView(): void {
    const viewId = this.selectedViewId();
    if (!viewId) return;

    this.loadingData.set(true);

    const inst = this.selectedInstitution();
    const gestion = this.selectedGestion();
    const mes = this.selectedMes();

    this.analyticsService
      .executePredefinedView(viewId, {
        institutions: inst ? [inst] : undefined,
        gestion: gestion !== null ? gestion : undefined,
        mes: mes !== null ? mes : undefined,
        limit: this.resultLimit()
      })
      .subscribe({
        next: (result) => {
          this.viewResult.set(result);
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
      next: (res) => {
        this.lastMaterialization.set(res);
        this.materializing.set(false);
        this.loadCatalogAndDimensions();
      },
      error: () => {
        this.materializing.set(false);
      }
    });
  }

  onInstitutionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedInstitution.set(val);
    this.refreshCurrentView();
  }

  onGestionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedGestion.set(val ? Number(val) : null);
    this.refreshCurrentView();
  }

  onMesChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedMes.set(val ? Number(val) : null);
    this.refreshCurrentView();
  }

  onLimitChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.resultLimit.set(val);
    this.refreshCurrentView();
  }

  onDictSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.dictSearchTerm.set(val);
  }

  getMonthName(monthNum: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthNum - 1] || `Mes ${monthNum}`;
  }

  formatColumnHeader(col: string): string {
    switch (col) {
      case 'institucion':
      case 'institucion_id': return 'ID';
      case 'institucion_nombre': return 'Entidad';
      case 'gestion': return 'Gestión';
      case 'mes': return 'Mes';
      case 'cartera_bruta': return 'Cartera Bruta';
      case 'cartera_en_mora': return 'Cartera en Mora';
      case 'total_activo': return 'Activo Total';
      case 'total_pasivo': return 'Pasivo Total';
      case 'total_patrimonio': return 'Patrimonio';
      case 'prevision_cartera':
      case 'previsiones_especificas': return 'Previsiones';
      case 'ratio_mora':
      case 'mora_pct': return 'Ratio Mora';
      case 'ratio_cobertura':
      case 'ratio_cobertura_mora': return 'Ratio Cobertura';
      case 'total_registros': return 'Registros';
      default: return col.replace(/_/g, ' ');
    }
  }

  isNumericCol(col: string): boolean {
    return (
      col.includes('cartera') ||
      col.includes('ratio') ||
      col.includes('prevision') ||
      col.includes('mora') ||
      col.includes('activo') ||
      col.includes('pasivo') ||
      col.includes('patrimonio') ||
      col.includes('total') ||
      col === 'gestion' ||
      col === 'mes'
    );
  }

  isCurrencyCol(col: string): boolean {
    return (
      col.includes('cartera') ||
      col.includes('activo') ||
      col.includes('pasivo') ||
      col.includes('patrimonio') ||
      col.includes('prevision')
    ) && !col.includes('ratio');
  }

  isPercentCol(col: string): boolean {
    return col === 'ratio_mora' || col === 'mora_pct';
  }

  isRatioCol(col: string): boolean {
    return col === 'ratio_cobertura' || col === 'ratio_cobertura_mora';
  }

  formatCurrency(val: any): string {
    if (typeof val !== 'number') return String(val ?? '-');
    return val.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Bs.';
  }

  formatPercent(val: any): string {
    if (typeof val !== 'number') return String(val ?? '-');
    const pct = val <= 1.0 ? val * 100 : val;
    return pct.toFixed(2) + '%';
  }

  formatDecimal(val: any): string {
    if (typeof val !== 'number') return String(val ?? '-');
    return val.toFixed(2);
  }

  getMoraClass(val: any): string {
    if (typeof val !== 'number') return '';
    const pct = val <= 1.0 ? val * 100 : val;
    if (pct < 2.0) return 'mora-low';
    if (pct < 4.0) return 'mora-med';
    return 'mora-high';
  }

  getCoberturaPercentage(ratio: any): number {
    if (typeof ratio !== 'number') return 0;
    const capped = Math.min(ratio, 10.0);
    return Math.max(5, (capped / 10.0) * 100);
  }
}
