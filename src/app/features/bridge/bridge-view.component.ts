import { Component, inject } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { BridgeStore } from './bridge.store';
import { ReconciliationDiffItem } from '../../core/models/reconciliation.model';

@Component({
  selector: 'app-bridge-view',
  standalone: true,
  imports: [SlicePipe],
  template: `
    <div class="bridge-container">
      <!-- Header & Scope Banner -->
      <div class="bridge-header-card">
        <div class="header-main">
          <div class="header-titles">
            <span class="system-badge">CONCILIACIÓN Y AUDITORÍA DE INVENTARIO</span>
            <h1 class="header-title">Puente de Conciliación y Sincronización Operativa</h1>
            <p class="header-desc">
              Cruce analítico vectorizado entre el inventario web indexado por el Prospector Externo y
              los archivos originales custodiados físicamente en el repositorio interno. Permite identificar
              novedades, confirmar disponibilidad inmediata y despachar lotes de ingesta hacia la custodia inmutable.
            </p>
          </div>

          <div class="source-picker-box">
            <label class="picker-label" for="bridge-source-select">Entidad Emisora:</label>
            <select
              id="bridge-source-select"
              class="source-select"
              [value]="store.selectedSourceId()"
              (change)="onSourceSelect($event)"
              [disabled]="store.reconciling() || store.syncing()"
            >
              <option value="bcb">Banco Central de Bolivia (BCB)</option>
              <option value="bbv">Bolsa Boliviana de Valores (BBV)</option>
              <option value="finrural">Asociación FINRURAL</option>
              <option value="ine">Instituto Nacional de Estadística (INE)</option>
              <option value="aps">Autoridad de Pensiones y Seguros (APS)</option>
              <option value="asfi_valores">Supervisión del Sistema Financiero (ASFI)</option>
            </select>
            <button
              type="button"
              class="btn-reconcile"
              (click)="onReconcile()"
              [disabled]="store.reconciling() || store.syncing()"
            >
              @if (store.reconciling()) {
                <span>Conciliando...</span>
              } @else {
                <span>Actualizar Conciliación</span>
              }
            </button>
          </div>
        </div>

        @if (store.error(); as err) {
          <div class="error-banner">
            <span class="error-label">AVISO OPERATIVO:</span>
            <span class="error-msg">{{ err }}</span>
          </div>
        }
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">INVENTARIO WEB INDEXADO</span>
            <span class="kpi-badge badge-neutral">RADAR EXTERNO</span>
          </div>
          <div class="kpi-value">{{ store.totalDiscovered() }}</div>
          <div class="kpi-caption">Publicaciones descubiertas en portal oficial</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">RESGUARDADOS EN CUSTODIA</span>
            <span class="kpi-badge badge-success">DISPONIBILIDAD INMEDIATA</span>
          </div>
          <div class="kpi-value text-success">{{ store.totalConfirmed() }}</div>
          <div class="kpi-caption">Archivos verificados físicamente con firma SHA-256</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">PENDIENTES DE ADQUISICIÓN</span>
            <span class="kpi-badge badge-info">NOVEDADES</span>
          </div>
          <div class="kpi-value text-info">{{ store.totalNew() }}</div>
          <div class="kpi-caption">Nuevos documentos identificados para descarga</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">MODIFICADOS EN ORIGEN</span>
            <span class="kpi-badge badge-warning">DISCREPANCIAS</span>
          </div>
          <div class="kpi-value text-warning">{{ store.totalModified() }}</div>
          <div class="kpi-caption">Archivos con alteración de contenido o versión</div>
        </div>
      </div>

      <!-- Operational Sync Panel -->
      <div class="sync-panel-card">
        <div class="sync-panel-header">
          <div>
            <h3 class="panel-title">Plan de Sincronización e Ingesta Masiva</h3>
            <p class="panel-desc">
              Descarga física controlada hacia Capa Bronze pasando por el Pre-Flight Gatekeeper, limitador de tasa adaptativo
              y cómputo de integridad criptográfica en vuelo.
            </p>
          </div>

          <div class="sync-controls">
            <div class="batch-selector">
              <label class="batch-label" for="batch-size-select">Tamaño de Lote:</label>
              <select
                id="batch-size-select"
                class="batch-select"
                [value]="store.batchSize()"
                (change)="onBatchSizeChange($event)"
                [disabled]="store.syncing()"
              >
                <option [value]="5">5 descargas</option>
                <option [value]="10">10 descargas</option>
                <option [value]="25">25 descargas</option>
                <option [value]="50">50 descargas</option>
              </select>
            </div>

            <button
              type="button"
              class="btn-sync-exec"
              (click)="onExecuteSync(true)"
              [disabled]="store.syncing() || store.reconciling() || store.totalNew() === 0"
            >
              @if (store.syncing()) {
                <span>Adquiriendo Lote...</span>
              } @else {
                <span>Descargar Lote hacia Custodia (Bronze)</span>
              }
            </button>
          </div>
        </div>

        @if (store.lastSyncResult(); as syncRes) {
          <div class="sync-result-box result-executed">
            <div class="result-top">
              <span class="result-badge mono">INGESTA COMPLETADA</span>
              <span class="result-id mono">ID Plan: {{ syncRes.plan_id }}</span>
            </div>
            <p class="result-summary">{{ syncRes.summary }}</p>
            @if (syncRes.is_executed) {
              <div class="result-stats">
                <span class="stat-tag text-success">Exitosos: {{ syncRes.completed_tasks }}</span>
                <span class="stat-tag" [class.text-danger]="syncRes.failed_tasks > 0">Fallidos: {{ syncRes.failed_tasks }}</span>
                <span class="stat-tag">Total Tareas: {{ syncRes.total_tasks }}</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Diff Inventory Table -->
      <div class="table-card">
        <div class="table-toolbar">
          <div class="category-filters">
            <button
              type="button"
              class="filter-tab"
              [class.active]="store.categoryFilter() === 'ALL'"
              (click)="store.setCategoryFilter('ALL')"
            >
              Todos ({{ store.totalDiscovered() }})
            </button>
            <button
              type="button"
              class="filter-tab"
              [class.active]="store.categoryFilter() === 'NEW'"
              (click)="store.setCategoryFilter('NEW')"
            >
              Nuevos Pendientes ({{ store.totalNew() }})
            </button>
            <button
              type="button"
              class="filter-tab"
              [class.active]="store.categoryFilter() === 'CONFIRMED'"
              (click)="store.setCategoryFilter('CONFIRMED')"
            >
              En Custodia Local ({{ store.totalConfirmed() }})
            </button>
            <button
              type="button"
              class="filter-tab"
              [class.active]="store.categoryFilter() === 'MODIFIED'"
              (click)="store.setCategoryFilter('MODIFIED')"
            >
              Modificados ({{ store.totalModified() }})
            </button>
          </div>

          <div class="search-box">
            <input
              type="text"
              class="search-input mono"
              placeholder="Filtrar por URL, código o período..."
              [value]="store.searchQuery()"
              (input)="onSearchInput($event)"
            />
          </div>
        </div>

        @if (store.reconciling()) {
          <div class="loading-state">
            <span class="loading-spinner"></span>
            <span>Ejecutando cruce analítico en memoria con el inventario local...</span>
          </div>
        } @else if (store.pagedItems().length === 0) {
          <div class="empty-state">
            <span class="empty-title">Sin registros coincidentes</span>
            <span class="empty-desc">No se encontraron discrepancias bajo los filtros seleccionados.</span>
          </div>
        } @else {
          <div class="table-wrapper">
            <table class="diff-table">
              <thead>
                <tr>
                  <th style="width: 130px;">ESTADO</th>
                  <th style="width: 100px;">PERÍODO</th>
                  <th style="width: 90px;">FORMATO</th>
                  <th>DIRECCIÓN OFICIAL / RECURSO</th>
                  <th>DETALLE DE CONCILIACIÓN</th>
                </tr>
              </thead>
              <tbody>
                @for (item of store.pagedItems(); track item.resource_key) {
                  <tr>
                    <td>
                      @switch (item.category) {
                        @case ('CONFIRMED') {
                          <span class="badge-status badge-confirmed">CUSTODIA</span>
                        }
                        @case ('NEW') {
                          <span class="badge-status badge-new">NOVEDAD</span>
                        }
                        @case ('MODIFIED') {
                          <span class="badge-status badge-modified">MODIFICADO</span>
                        }
                        @default {
                          <span class="badge-status badge-neutral">{{ item.category }}</span>
                        }
                      }
                    </td>
                    <td class="mono font-bold">{{ item.period_label || 'Vigente' }}</td>
                    <td>
                      <span class="format-pill mono">{{ (item.file_extension || '.xlsx').toUpperCase() }}</span>
                    </td>
                    <td>
                      <div class="url-cell">
                        <a [href]="item.url" target="_blank" rel="noopener noreferrer" class="url-link mono" [title]="item.url">
                          {{ item.url }}
                        </a>
                        <span class="key-sub mono snippet">Clave: {{ item.resource_key | slice:0:16 }}...</span>
                      </div>
                    </td>
                    <td>
                      <span class="detail-text">{{ item.detail }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="pagination-footer">
            <span class="pagination-info">
              Mostrando registros {{ store.paginationStart() }} al {{ store.paginationEnd() }} de {{ store.totalFiltered() }}
            </span>

            <div class="pagination-controls">
              <button
                type="button"
                class="btn-page"
                [disabled]="store.currentPage() === 1"
                (click)="store.setPage(store.currentPage() - 1)"
              >
                Anterior
              </button>
              <span class="page-indicator mono">Pág. {{ store.currentPage() }} de {{ store.totalPages() }}</span>
              <button
                type="button"
                class="btn-page"
                [disabled]="store.currentPage() === store.totalPages()"
                (click)="store.setPage(store.currentPage() + 1)"
              >
                Siguiente
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .bridge-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Header */
    .bridge-header-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      flex-wrap: wrap;
    }
    .header-titles {
      max-width: 700px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .system-badge {
      font-size: 11px;
      font-weight: 700;
      color: #3b82f6;
      letter-spacing: 0.08em;
      font-family: var(--font-mono);
    }
    .header-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }
    .header-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .source-picker-box {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 12px 16px;
    }
    .picker-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
    }
    .source-select {
      background: var(--bg-surface);
      color: var(--text-main);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 600;
      outline: none;
      min-width: 260px;
    }
    .source-select:focus {
      border-color: #3b82f6;
    }
    .btn-reconcile {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-reconcile:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-reconcile:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .error-banner {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .error-label {
      font-size: 11px;
      font-weight: 700;
      color: #ef4444;
      font-family: var(--font-mono);
    }
    .error-msg {
      font-size: 12px;
      color: var(--text-main);
    }

    /* KPIs */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .kpi-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .kpi-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-subtle);
      letter-spacing: 0.05em;
    }
    .kpi-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .badge-neutral { background: var(--bg-app); color: var(--text-muted); border: 1px solid var(--border-subtle); }
    .badge-success { background: rgba(34, 197, 94, 0.1); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.25); }
    .badge-info { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.25); }
    .badge-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.25); }

    .kpi-value {
      font-size: 26px;
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--text-main);
    }
    .text-success { color: #22c55e !important; }
    .text-info { color: #3b82f6 !important; }
    .text-warning { color: #f59e0b !important; }
    .text-danger { color: #ef4444 !important; }
    .kpi-caption {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Sync Panel */
    .sync-panel-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .sync-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .panel-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }
    .panel-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
      max-width: 650px;
    }

    .sync-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .batch-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .batch-label {
      font-size: 12px;
      color: var(--text-muted);
    }
    .batch-select {
      background: var(--bg-app);
      color: var(--text-main);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 600;
    }
    .btn-sync-dry {
      background: transparent;
      color: var(--text-main);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-sync-dry:hover:not(:disabled) {
      border-color: #3b82f6;
      color: #3b82f6;
    }
    .btn-sync-dry:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-sync-exec {
      background: #10b981;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-sync-exec:hover:not(:disabled) {
      background: #059669;
    }
    .btn-sync-exec:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .sync-result-box {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .sync-result-box.result-executed {
      border-color: rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.05);
    }
    .result-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .result-badge {
      font-size: 11px;
      font-weight: 700;
      color: #10b981;
    }
    .result-id {
      font-size: 11px;
      color: var(--text-subtle);
    }
    .result-summary {
      font-size: 13px;
      color: var(--text-main);
    }
    .result-stats {
      display: flex;
      gap: 16px;
      font-size: 12px;
      font-weight: 600;
    }

    /* Table & Toolbar */
    .table-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .table-toolbar {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .category-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-tab {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-tab:hover {
      color: var(--text-main);
    }
    .filter-tab.active {
      background: rgba(59, 130, 246, 0.15);
      border-color: #3b82f6;
      color: #60a5fa;
    }

    .search-input {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      padding: 6px 12px;
      color: var(--text-main);
      font-size: 12px;
      width: 280px;
      outline: none;
    }
    .search-input:focus {
      border-color: #3b82f6;
    }

    .table-wrapper {
      overflow-x: auto;
    }
    .diff-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    .diff-table th {
      background: var(--bg-app);
      color: var(--text-subtle);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .diff-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-main);
      vertical-align: middle;
    }
    .diff-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .badge-status {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 3px;
      font-family: var(--font-mono);
      letter-spacing: 0.04em;
    }
    .badge-confirmed {
      background: rgba(34, 197, 94, 0.12);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .badge-new {
      background: rgba(59, 130, 246, 0.12);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .badge-modified {
      background: rgba(245, 158, 11, 0.12);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .format-pill {
      font-size: 11px;
      font-weight: 700;
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      padding: 2px 6px;
      border-radius: 3px;
      color: var(--text-muted);
    }

    .url-cell {
      display: flex;
      flex-direction: column;
      gap: 3px;
      max-width: 480px;
    }
    .url-link {
      font-size: 12px;
      color: #60a5fa;
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .url-link:hover {
      text-decoration: underline;
    }
    .key-sub {
      font-size: 11px;
      color: var(--text-subtle);
    }
    .detail-text {
      font-size: 12px;
      color: var(--text-muted);
    }

    .loading-state, .empty-state {
      padding: 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--text-muted);
      font-size: 13px;
    }
    .loading-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--border-subtle);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .empty-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
    }

    .pagination-footer {
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-app);
      font-size: 12px;
      color: var(--text-muted);
    }
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-page {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-page:hover:not(:disabled) {
      border-color: #3b82f6;
      color: #3b82f6;
    }
    .btn-page:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .page-indicator {
      font-size: 12px;
    }
  `]
})
export class BridgeViewComponent {
  readonly store = inject(BridgeStore);

  onSourceSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.store.setSource(target.value);
  }

  onReconcile(): void {
    this.store.reconcileSource(this.store.selectedSourceId());
  }

  onBatchSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.store.setBatchSize(parseInt(target.value, 10) || 5);
  }

  onExecuteSync(executeDownloads: boolean): void {
    this.store.executeSyncPlan({ executeDownloads });
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.store.setSearchQuery(target.value);
  }
}
