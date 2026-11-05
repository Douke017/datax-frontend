import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryStore } from '../inventory.store';
import { UrlInventoryItem } from '../../../core/models/inventory.model';

@Component({
  selector: 'app-interno-curaduria',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="curaduria-container">
      <!-- KPIs Cuantitativos Reales -->
      <div class="kpi-row">
        <div class="kpi-mini">
          <span class="kpi-mini-label">TOTAL URLS</span>
          <span class="kpi-mini-value mono">{{ store.totalUrls() }}</span>
        </div>
        <div class="kpi-mini">
          <span class="kpi-mini-label">DESCARGADAS (BRONZE)</span>
          <span class="kpi-mini-value mono text-emerald">{{ store.totalDownloaded() }}</span>
          <span class="kpi-mini-sub mono">{{ store.downloadRate() }}%</span>
        </div>
        <div class="kpi-mini">
          <span class="kpi-mini-label">PROCESADAS (GOLD)</span>
          <span class="kpi-mini-value mono text-cyan">{{ store.totalProcessed() }}</span>
          <span class="kpi-mini-sub mono">{{ store.processingRate() }}%</span>
        </div>
        <div class="kpi-mini">
          <span class="kpi-mini-label">PENDIENTES</span>
          <span class="kpi-mini-value mono text-amber">{{ store.totalUrls() - store.totalDownloaded() }}</span>
        </div>
      </div>

      <!-- Barra de Filtros Operativos -->
      <div class="filter-bar">
        <div class="filter-item">
          <label for="curaduria-src" class="filter-label">Institución:</label>
          <select
            id="curaduria-src"
            class="select-control"
            [value]="store.selectedSource()"
            (change)="onSourceChange($event)"
          >
            <option value="ALL">Todas las fuentes</option>
            @for (src of store.sourcesList(); track src) {
              <option [value]="src">{{ src }}</option>
            }
          </select>
        </div>

        <div class="filter-item">
          <label for="curaduria-status" class="filter-label">Estado:</label>
          <select
            id="curaduria-status"
            class="select-control"
            [value]="store.selectedStatus()"
            (change)="onStatusChange($event)"
          >
            <option value="ALL">Todos los estados</option>
            <option value="DISPONIBLE_WEB_NUEVO">DISPONIBLE_WEB_NUEVO</option>
            <option value="CATALOGADO_BDD">CATALOGADO_BDD</option>
            <option value="DESCARGA_HISTORICA_LEGACY">DESCARGA_HISTORICA_LEGACY</option>
            <option value="DESCARGADO_BRONZE">DESCARGADO_BRONZE</option>
          </select>
        </div>

        <div class="filter-item">
          <label for="curaduria-dl" class="filter-label">Descarga:</label>
          <select
            id="curaduria-dl"
            class="select-control"
            (change)="onDownloadFilterChange($event)"
          >
            <option value="ALL">Todas</option>
            <option value="YES">Solo Descargadas</option>
            <option value="NO">Pendientes Descarga</option>
          </select>
        </div>

        <div class="filter-item">
          <label for="curaduria-pr" class="filter-label">Procesamiento:</label>
          <select
            id="curaduria-pr"
            class="select-control"
            (change)="onProcessedFilterChange($event)"
          >
            <option value="ALL">Todas</option>
            <option value="YES">Solo Procesadas</option>
            <option value="NO">Pendientes Proceso</option>
          </select>
        </div>

        <div class="filter-item search-item">
          <label for="curaduria-search" class="filter-label">Búsqueda:</label>
          <input
            id="curaduria-search"
            type="text"
            class="input-control mono"
            placeholder="Buscar por URL, archivo o código..."
            [value]="store.searchQuery()"
            (input)="onSearchInput($event)"
          />
        </div>
      </div>

      <!-- Tabla de URLs e Ingesta -->
      <div class="table-card">
        @if (store.loading()) {
          <div class="loading-state">
            <span class="loading-spinner"></span>
            <span>Consultando inventario de URLs...</span>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="inventory-table">
              <thead>
                <tr>
                  <th class="th-src">Institución</th>
                  <th class="th-code">Código</th>
                  <th class="th-name">Archivo / Título</th>
                  <th class="th-url">URL Canónica</th>
                  <th class="th-status">Custodia (Bronze)</th>
                  <th class="th-switch">Procesado (Gold)</th>
                  <th class="th-status">Estado</th>
                  <th class="th-updated">Actualizado</th>
                </tr>
              </thead>
              <tbody>
                @for (item of store.items(); track item.id) {
                  <tr class="item-row" [class.row-downloaded]="item.is_downloaded" [class.row-processed]="item.is_processed">
                    <td class="td-src">
                      <span class="source-tag mono">{{ item.source_id }}</span>
                    </td>
                    <td class="td-code mono">{{ item.file_code || ('#' + item.id) }}</td>
                    <td class="td-name">
                      <div class="file-name" [title]="item.file_name || 'Sin título'">
                        {{ item.file_name || 'Sin título asignado' }}
                      </div>
                    </td>
                    <td class="td-url">
                      <a
                        [href]="item.canonical_url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="url-link mono"
                        [title]="item.canonical_url"
                      >
                        {{ item.canonical_url }}
                      </a>
                    </td>
                    <td class="td-status-badge">
                      @if (item.is_downloaded) {
                        <span class="badge-custody-ok mono" [title]="'Custodia física confirmada · SHA-256: ' + (item.sha256_hash || 'En disco')">
                          <span class="badge-dot-green"></span>
                          EN CUSTODIA
                        </span>
                      } @else {
                        <span class="badge-custody-pending mono" title="Archivo aún no descargado físicamente en Bronze">
                          <span class="badge-dot-gray"></span>
                          NO DESCARGADO
                        </span>
                      }
                    </td>
                    <td class="td-switch">
                      <button
                        type="button"
                        class="toggle-btn"
                        [class.active]="item.is_processed"
                        [disabled]="store.updatingId() === item.id"
                        (click)="store.toggleProcessed(item)"
                        title="Marcar / desmarcar si el dataset fue procesado hacia Capa Gold"
                      >
                        <span class="toggle-dot"></span>
                        <span class="toggle-text">{{ item.is_processed ? 'PROCESADO' : 'PENDIENTE' }}</span>
                      </button>
                    </td>
                    <td class="td-status">
                      <span class="status-pill mono" [class.status-bronze]="item.status === 'DESCARGADO_BRONZE'" [class.status-new]="item.status === 'DISPONIBLE_WEB_NUEVO'">
                        {{ item.status }}
                      </span>
                    </td>
                    <td class="td-updated mono">{{ item.updated_at || '-' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="empty-state">
                      No se encontraron URLs con los filtros seleccionados.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación Directa -->
          <div class="pagination-bar">
            <span class="pagination-info mono">
              Mostrando página {{ store.currentPage() }} de {{ store.totalPages() }} ({{ store.totalItems() }} URLs encontradas)
            </span>
            <div class="pagination-actions">
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
        }
      </div>
    </div>
  `,
  styles: [`
    .curaduria-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .kpi-mini {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .kpi-mini-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.5px;
    }
    .kpi-mini-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
    }
    .kpi-mini-sub {
      font-size: 12px;
      color: var(--text-muted);
    }
    .text-emerald { color: #10b981; }
    .text-cyan { color: #06b6d4; }
    .text-amber { color: #f59e0b; }

    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 12px 14px;
      align-items: flex-end;
    }
    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .filter-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .select-control, .input-control {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 13px;
      outline: none;
    }
    .search-item {
      flex: 1;
      min-width: 220px;
    }
    .input-control {
      width: 100%;
    }

    .table-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      overflow: hidden;
    }
    .table-responsive {
      overflow-x: auto;
    }
    .inventory-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    .inventory-table th {
      background: var(--bg-card);
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-subtle);
      white-space: nowrap;
    }
    .inventory-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-main);
      vertical-align: middle;
    }
    .item-row:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    .source-tag {
      display: inline-block;
      padding: 2px 6px;
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .td-code {
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
    }
    .file-name {
      max-width: 240px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }
    .url-link {
      display: inline-block;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #60a5fa;
      text-decoration: none;
      font-size: 12px;
    }
    .url-link:hover {
      text-decoration: underline;
    }
    .toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 12px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-muted);
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
      transition: all 0.15s ease;
    }
    .toggle-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #64748b;
    }
    .toggle-btn.active {
      background: rgba(16, 185, 129, 0.15);
      border-color: #10b981;
      color: #10b981;
    }
    .toggle-btn.active .toggle-dot {
      background: #10b981;
    }
    .badge-custody-ok {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
      white-space: nowrap;
    }
    .badge-custody-pending {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      background: rgba(148, 163, 184, 0.08);
      border: 1px solid rgba(148, 163, 184, 0.2);
      color: #94a3b8;
      white-space: nowrap;
    }
    .badge-dot-green {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    }
    .badge-dot-gray {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #64748b;
    }
    .status-pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-muted);
    }
    .status-bronze {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
    }
    .status-new {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
    }
    .td-updated {
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .loading-state, .empty-state {
      padding: 32px;
      text-align: center;
      color: var(--text-muted);
      font-size: 14px;
    }
    .loading-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid var(--border-subtle);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
      vertical-align: middle;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-card);
    }
    .pagination-info {
      font-size: 12px;
      color: var(--text-muted);
    }
    .pagination-actions {
      display: flex;
      gap: 8px;
    }
    .btn-page {
      padding: 4px 12px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      color: var(--text-main);
      font-size: 12px;
      cursor: pointer;
    }
    .btn-page:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `]
})
export class InternoCuraduriaComponent {
  readonly store = inject(InventoryStore);

  onSourceChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.store.setSourceFilter(target.value);
  }

  onStatusChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.store.setStatusFilter(target.value);
  }

  onDownloadFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value === 'YES' ? true : target.value === 'NO' ? false : null;
    this.store.setDownloadFilter(val);
  }

  onProcessedFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value === 'YES' ? true : target.value === 'NO' ? false : null;
    this.store.setProcessedFilter(val);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.store.setSearchQuery(target.value);
  }
}
