import { Component, inject } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { InternoStore } from '../interno.store';
import { BronzeArtifactEntry } from '../../../core/models/reconciliation.model';

@Component({
  selector: 'app-interno-custodia',
  standalone: true,
  imports: [SlicePipe],
  template: `
    <div class="custodia-container">
      <!-- KPI Stats Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">ARCHIVOS RESGUARDADOS</span>
            <span class="kpi-badge badge-success">INMUTABLES</span>
          </div>
          <div class="kpi-value">{{ store.totalArtifactsCount() }}</div>
          <div class="kpi-caption">Documentos originales en custodia física</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">ESPACIO EN CUSTODIA</span>
            <span class="kpi-badge badge-info">REPOSITORIO LOCAL</span>
          </div>
          <div class="kpi-value">{{ store.totalBytesCustodyFormatted() }}</div>
          <div class="kpi-caption">Almacenamiento total verificado en disco</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">INTEGRIDAD CRIPTOGRÁFICA</span>
            <span class="kpi-badge badge-purple">SHA-256</span>
          </div>
          <div class="kpi-value">{{ store.integrityRate() }}</div>
          <div class="kpi-caption">Firmas validadas contra alteración o corrupción</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">PROTECCIÓN DE RED</span>
            <span class="kpi-badge badge-success">DISYUNTORES</span>
          </div>
          <div class="kpi-value">{{ store.allCircuitsOperational() ? 'OPERATIVO' : 'EN ENFRIAMIENTO' }}</div>
          <div class="kpi-caption">Tráfico respetuoso y rate limit regulado</div>
        </div>
      </div>

      <!-- Circuit Breakers Status Banner -->
      <div class="circuit-banner">
        <div class="circuit-header">
          <span class="circuit-title">Estado de Conexión y Disyuntores de Red (Circuit Breakers):</span>
          <span class="circuit-sub">Protección contra saturación de portales emisores</span>
        </div>
        <div class="circuits-list">
          @for (cb of store.circuitBreakers(); track cb.domain) {
            <div class="circuit-chip" [class.circuit-closed]="cb.status === 'CLOSED'">
              <span class="circuit-dot"></span>
              <span class="circuit-domain mono">{{ cb.domain }}</span>
              <span class="circuit-state mono">{{ cb.status === 'CLOSED' ? 'OPERATIVO (0 Fallas)' : 'EN ENFRIAMIENTO' }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar-card">
        <div class="search-box">
          <label class="toolbar-label" for="artifact-search">Búsqueda de archivos en custodia:</label>
          <input
            id="artifact-search"
            type="text"
            class="search-input mono"
            placeholder="Buscar por nombre, código de publicación o hash SHA-256..."
            [value]="store.searchQuery()"
            (input)="onSearchInput($event)"
          />
        </div>

        <div class="filter-group">
          <div class="filter-item">
            <label class="toolbar-label" for="source-filter">Entidad:</label>
            <select
              id="source-filter"
              class="select-input"
              [value]="store.sourceFilter()"
              (change)="onSourceChange($event)"
            >
              <option value="ALL">Todas las Entidades</option>
              @for (src of store.uniqueSources(); track src) {
                <option [value]="src">{{ src }}</option>
              }
            </select>
          </div>

          <div class="filter-item">
            <label class="toolbar-label" for="period-filter">Periodo:</label>
            <select
              id="period-filter"
              class="select-input"
              [value]="store.periodFilter()"
              (change)="onPeriodChange($event)"
            >
              <option value="ALL">Todos los Periodos</option>
              @for (p of store.uniquePeriods(); track p) {
                <option [value]="p">{{ p }}</option>
              }
            </select>
          </div>

          <button
            type="button"
            class="btn-sync-action"
            [disabled]="store.syncing()"
            (click)="store.runSyncBatch('bbv')"
          >
            @if (store.syncing()) {
              <span>Descargando Lote...</span>
            } @else {
              <span>Ejecutar Resguardo Asistido</span>
            }
          </button>
        </div>
      </div>

      <!-- Sync Result Banner -->
      @if (store.lastSyncResult(); as syncRes) {
        <div class="sync-banner">
          <div class="sync-heading">
            <span class="sync-tag mono">PLAN DE RESGUARDO COMPLETADO</span>
            <span class="sync-summary">{{ syncRes.summary }}</span>
          </div>
          <div class="sync-stats mono">
            <span>Tareas Exitosas: <strong>{{ syncRes.completed_tasks }}</strong> / {{ syncRes.total_tasks }}</span>
          </div>
        </div>
      }

      <!-- Artifacts Table -->
      <div class="table-card">
        <div class="table-scroll-container">
          <table class="custodia-table">
            <thead>
              <tr>
                <th>Código de Publicación</th>
                <th>Periodo</th>
                <th>Portal Emisor</th>
                <th>Tamaño</th>
                <th>Firma Criptográfica SHA-256</th>
                <th>Fecha de Resguardo</th>
                <th>Auditoría de Integridad</th>
              </tr>
            </thead>
            <tbody>
              @for (art of store.pagedArtifacts(); track art.artifact_id) {
                <tr class="table-row">
                  <td class="mono font-bold">{{ art.dataset_code }}</td>
                  <td class="mono">{{ art.period || 'Periódico' }}</td>
                  <td class="mono text-muted-subtle">{{ art.domain }}</td>
                  <td class="mono">{{ formatBytes(art.size_bytes) }}</td>
                  <td class="mono sha-cell">
                    <span class="sha-snippet" [title]="art.sha256_hash">
                      {{ art.sha256_hash | slice:0:16 }}...
                    </span>
                    <button
                      type="button"
                      class="btn-copy-hash"
                      (click)="copyHash(art.sha256_hash)"
                      title="Copiar firma SHA-256 completa"
                    >
                      Copiar
                    </button>
                  </td>
                  <td class="mono">{{ art.downloaded_at | slice:0:19 }}</td>
                  <td>
                    @if (store.verifiedArtifacts()[art.artifact_id]) {
                      <span class="badge-integrity-ok">
                        INTEGRIDAD CERTIFICADA
                      </span>
                    } @else {
                      <button
                        type="button"
                        class="btn-verify"
                        (click)="store.verifyArtifactIntegrity(art.artifact_id)"
                      >
                        Auditar Hash
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="pagination-bar">
          <div class="pagination-info">
            Mostrando <span class="mono">{{ store.paginationRange().start }} – {{ store.paginationRange().end }}</span> de
            <span class="mono">{{ store.totalFiltered() }}</span> archivos en custodia
          </div>

          <div class="pagination-controls">
            <button
              type="button"
              class="btn-page"
              [disabled]="store.currentPage() <= 1"
              (click)="store.setPage(store.currentPage() - 1)"
            >
              Anterior
            </button>
            <button
              type="button"
              class="btn-page"
              [disabled]="store.currentPage() >= store.totalPages()"
              (click)="store.setPage(store.currentPage() + 1)"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custodia-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .kpi-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .kpi-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .kpi-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-subtle);
      letter-spacing: 0.05em;
    }
    .kpi-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .kpi-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-main);
      font-family: var(--font-mono);
      letter-spacing: -0.02em;
    }
    .kpi-caption {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Circuit Breaker Banner */
    .circuit-banner {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .circuit-header {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .circuit-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-main);
    }
    .circuit-sub {
      font-size: 11px;
      color: var(--text-subtle);
    }
    .circuits-list {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .circuit-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      font-size: 11px;
    }
    .circuit-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 5px rgba(16, 185, 129, 0.5);
    }
    .circuit-domain {
      font-weight: 700;
      color: var(--text-main);
    }
    .circuit-state {
      font-size: 10px;
      color: #34d399;
    }

    /* Toolbar */
    .toolbar-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .toolbar-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      text-transform: uppercase;
    }
    .search-box {
      flex: 1;
      min-width: 280px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .search-input {
      background: var(--bg-app);
      border: 1px solid var(--border-medium);
      color: var(--text-main);
      padding: 7px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--border-focus);
    }
    .filter-group {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .select-input {
      background: var(--bg-app);
      border: 1px solid var(--border-medium);
      color: var(--text-main);
      padding: 7px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      min-width: 150px;
      cursor: pointer;
    }
    .btn-sync-action {
      background: var(--primary);
      border: 1px solid #1d4ed8;
      color: #ffffff;
      padding: 7px 16px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-sync-action:hover:not(:disabled) {
      background: var(--primary-hover);
    }
    .btn-sync-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Sync Banner */
    .sync-banner {
      background: var(--bg-surface);
      border: 1px solid rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.04);
      border-radius: var(--radius-sm);
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .sync-heading {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sync-tag {
      font-size: 10px;
      font-weight: 700;
      color: #34d399;
      letter-spacing: 0.04em;
    }
    .sync-summary {
      font-size: 12px;
      color: var(--text-main);
    }
    .sync-stats {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Table */
    .table-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .table-scroll-container {
      width: 100%;
      overflow-x: auto;
    }
    .custodia-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 12px;
    }
    .custodia-table th {
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-medium);
      white-space: nowrap;
    }
    .custodia-table td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-main);
      vertical-align: middle;
      white-space: nowrap;
    }
    .sha-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sha-snippet {
      color: #60a5fa;
      font-size: 11px;
    }
    .btn-copy-hash {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      color: var(--text-subtle);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      cursor: pointer;
    }
    .btn-copy-hash:hover {
      color: var(--text-main);
      border-color: var(--border-medium);
    }
    .badge-integrity-ok {
      font-size: 9px;
      font-weight: 700;
      font-family: var(--font-mono);
      background: var(--success-bg);
      color: #34d399;
      border: 1px solid var(--success-border);
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.04em;
    }
    .btn-verify {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-medium);
      color: var(--text-muted);
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 11px;
      cursor: pointer;
    }
    .btn-verify:hover {
      color: var(--text-main);
      background: var(--bg-surface-hover);
    }
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: var(--bg-surface-elevated);
      border-top: 1px solid var(--border-subtle);
      font-size: 12px;
    }
    .pagination-info {
      color: var(--text-muted);
    }
    .pagination-controls {
      display: flex;
      gap: 8px;
    }
    .btn-page {
      background: var(--bg-surface);
      border: 1px solid var(--border-medium);
      color: var(--text-main);
      padding: 4px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      cursor: pointer;
    }
    .btn-page:hover:not(:disabled) {
      background: var(--bg-surface-hover);
    }
    .btn-page:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .mono {
      font-family: var(--font-mono);
    }
    .font-bold {
      font-weight: 700;
    }
    .text-muted-subtle {
      color: var(--text-muted);
    }
  `]
})
export class InternoCustodiaComponent {
  readonly store = inject(InternoStore);

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.store.setSearchQuery(val);
  }

  onSourceChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.store.setSourceFilter(val);
  }

  onPeriodChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.store.setPeriodFilter(val);
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  copyHash(hash: string): void {
    navigator.clipboard.writeText(hash);
  }
}
