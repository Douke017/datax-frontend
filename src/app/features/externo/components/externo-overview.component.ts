import { Component, inject, signal, computed, Output, EventEmitter } from '@angular/core';
import { ExternoStore } from '../externo.store';
import { CatalogSource } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-externo-overview',
  standalone: true,
  imports: [],
  template: `
    <div class="overview-container">
      <!-- KPI Stats Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">FUENTES WEB MONITOREADAS</span>
            <span class="kpi-badge badge-success">ACTIVAS</span>
          </div>
          <div class="kpi-value">{{ store.activeSourcesCount() }} / {{ store.sources().length }}</div>
          <div class="kpi-caption">Portales y repositorios públicos bajo rastreo</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">RECURSOS DESCUBIERTOS</span>
            <span class="kpi-badge badge-info">INDEXADOS</span>
          </div>
          <div class="kpi-value">{{ store.totalDiscovered() }}</div>
          <div class="kpi-caption">Archivos de datos identificados en la web abierta</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">ARCHIVOS DOCUMENTALES</span>
            <span class="kpi-badge badge-purple">PDF</span>
          </div>
          <div class="kpi-value">{{ store.kpiSummary().pdfCount }}</div>
          <div class="kpi-caption">Documentos e informes técnicos (.pdf)</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">DATASETS TABULARES</span>
            <span class="kpi-badge badge-warning">XLSX / CSV / DAT</span>
          </div>
          <div class="kpi-value">{{ store.kpiSummary().excelCount }}</div>
          <div class="kpi-caption">Conjuntos de datos estructurados para ingesta (.xlsx / .csv)</div>
        </div>
      </div>

      <!-- Sources Section -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Portales y Repositorios Públicos</h2>
            <p class="section-desc">Fuentes web oficiales registradas para inspección periódica y extracción dirigida.</p>
          </div>
          <div class="header-badges">
            <span class="catalog-badge">CATÁLOGO ACTIVO ({{ store.sources().length }})</span>
          </div>
        </div>

        <!-- Portal Search & Quick Filters -->
        <div class="portal-toolbar">
          <div class="search-box">
            <input
              type="text"
              class="portal-search-input"
              placeholder="Buscar fuente por nombre, sigla o código (ej. ASFI, BCB, INE)..."
              [value]="searchPortal()"
              (input)="onSearchInput($event)"
            />
            @if (searchPortal()) {
              <button type="button" class="btn-clear-search" (click)="clearSearch()">✕</button>
            }
          </div>

          <div class="portal-filter-buttons">
            <button
              type="button"
              class="filter-pill"
              [class.active]="portalFilter() === 'ALL'"
              (click)="setPortalFilter('ALL')"
            >
              Todas ({{ store.sources().length }})
            </button>
            <button
              type="button"
              class="filter-pill"
              [class.active]="portalFilter() === 'WITH_RESOURCES'"
              (click)="setPortalFilter('WITH_RESOURCES')"
            >
              Con Recursos Indexados ({{ countSourcesWithResources() }})
            </button>
            <button
              type="button"
              class="filter-pill"
              [class.active]="portalFilter() === 'PENDING'"
              (click)="setPortalFilter('PENDING')"
            >
              En Espera de Barrido ({{ countSourcesPending() }})
            </button>
          </div>
        </div>

        <div class="sources-grid">
          @for (source of filteredSources(); track source.source_id) {
            <div class="source-card" [class.selected]="store.selectedSourceId() === source.source_id">
              <div class="source-top">
                <div class="source-identity">
                  <span class="source-code">{{ source.source_id.toUpperCase() }}</span>
                  <span class="source-name">{{ source.name }}</span>
                </div>
                <span class="status-indicator" [class.status-active]="source.health_status === 'ACTIVE'">
                  {{ source.health_status === 'ACTIVE' ? 'OPERATIVO' : 'EN ESPERA' }}
                </span>
              </div>

              <div class="source-details">
                <div class="detail-row">
                  <span class="detail-lbl">Punto de entrada:</span>
                  <a [href]="source.entrypoint" target="_blank" rel="noopener noreferrer" class="detail-link" [title]="source.entrypoint">
                    {{ source.entrypoint }}
                  </a>
                </div>
                <div class="detail-row">
                  <span class="detail-lbl">Frecuencia de inspección:</span>
                  <span class="detail-val">{{ source.update_category === 'DAILY' ? 'Diaria' : 'Mensual' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-lbl">Recursos disponibles:</span>
                  <span class="detail-val mono font-semibold">
                    {{ getSourceResourceCount(source.source_id) }} detectados
                  </span>
                </div>
              </div>

              <div class="source-actions">
                @if (getSourceResourceCount(source.source_id) > 0) {
                  <button
                    type="button"
                    class="btn-source-filter"
                    [class.active]="store.selectedSourceId() === source.source_id"
                    (click)="filterBySource(source.source_id)"
                    title="Explorar el inventario web indexado de este portal"
                  >
                    Explorar Recursos ({{ getSourceResourceCount(source.source_id) }}) &rarr;
                  </button>
                } @else {
                  <span class="badge-pending-crawl" title="Portal oficial registrado, pendiente de próximo ciclo de barrido">
                    En Espera de Barrido
                  </span>
                }
              </div>
            </div>
          } @empty {
            <div class="empty-sources">
              <span class="empty-icon">🔍</span>
              <p>No se encontraron portales que coincidan con la búsqueda.</p>
              <button type="button" class="btn-reset-filters" (click)="resetFilters()">Restablecer filtros</button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overview-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
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
      transition: border-color 0.15s ease;
    }
    .kpi-card:hover {
      border-color: var(--border-medium);
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
      letter-spacing: 0.04em;
    }
    .kpi-value {
      font-size: 26px;
      font-weight: 700;
      color: var(--text-main);
      font-family: var(--font-mono);
      letter-spacing: -0.02em;
    }
    .kpi-caption {
      font-size: 11px;
      color: var(--text-muted);
    }
    .section-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .section-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 16px;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.01em;
    }
    .section-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .catalog-badge {
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
      border: 1px solid var(--border-medium);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
    }
    .portal-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }
    .search-box {
      position: relative;
      flex: 1;
      min-width: 260px;
    }
    .portal-search-input {
      width: 100%;
      background: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-sm);
      color: var(--text-main);
      font-size: 12px;
      padding: 7px 30px 7px 12px;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .portal-search-input:focus {
      border-color: var(--border-focus);
    }
    .btn-clear-search {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-subtle);
      font-size: 12px;
      cursor: pointer;
      padding: 2px 4px;
    }
    .btn-clear-search:hover {
      color: var(--text-main);
    }
    .portal-filter-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .filter-pill {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 600;
      padding: 5px 12px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-pill:hover {
      color: var(--text-main);
      border-color: var(--border-medium);
    }
    .filter-pill.active {
      background: rgba(37, 99, 235, 0.1);
      border-color: var(--primary);
      color: #60a5fa;
    }
    .sources-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 16px;
    }
    .source-card {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: all 0.15s ease;
    }
    .source-card:hover {
      border-color: var(--border-medium);
    }
    .source-card.selected {
      border-color: var(--primary);
      background: rgba(37, 99, 235, 0.04);
    }
    .source-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .source-identity {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .source-code {
      font-size: 12px;
      font-weight: 700;
      color: #60a5fa;
      font-family: var(--font-mono);
      letter-spacing: 0.04em;
    }
    .source-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.3;
    }
    .status-indicator {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 3px;
      font-family: var(--font-mono);
      letter-spacing: 0.04em;
      background: var(--bg-surface-elevated);
      color: var(--text-subtle);
      border: 1px solid var(--border-subtle);
      white-space: nowrap;
    }
    .status-indicator.status-active {
      background: var(--success-bg);
      color: #34d399;
      border-color: var(--success-border);
    }
    .source-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 12px;
      background: var(--bg-surface);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }
    .detail-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
    }
    .detail-lbl {
      color: var(--text-subtle);
      font-weight: 500;
    }
    .detail-val {
      color: var(--text-muted);
      font-weight: 500;
    }
    .detail-val.mono {
      font-family: var(--font-mono);
    }
    .detail-link {
      color: #60a5fa;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      max-width: 200px;
    }
    .source-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }
    .btn-source-filter {
      background: var(--primary);
      color: #ffffff;
      border: 1px solid #1d4ed8;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-source-filter:hover {
      background: var(--primary-hover);
    }
    .btn-source-filter.active {
      background: #1d4ed8;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.4);
    }
    .badge-pending-crawl {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-subtle);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      padding: 5px 12px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      letter-spacing: 0.02em;
    }
    .empty-sources {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
      font-size: 13px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .empty-icon {
      font-size: 24px;
    }
    .btn-reset-filters {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-medium);
      color: var(--text-main);
      font-size: 12px;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .btn-reset-filters:hover {
      background: var(--bg-surface-hover);
    }
    .font-semibold {
      font-weight: 600;
    }
  `]
})
export class ExternoOverviewComponent {
  readonly store = inject(ExternoStore);
  @Output() readonly exploreSource = new EventEmitter<string>();

  readonly searchPortal = signal<string>('');
  readonly portalFilter = signal<'ALL' | 'WITH_RESOURCES' | 'PENDING'>('ALL');

  readonly sourceCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const r of this.store.resources()) {
      const key = r.source_id.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  });

  readonly countSourcesWithResources = computed(() => {
    const counts = this.sourceCounts();
    return this.store.sources().filter((s) => (counts.get(s.source_id.toLowerCase()) || 0) > 0).length;
  });

  readonly countSourcesPending = computed(() => {
    const counts = this.sourceCounts();
    return this.store.sources().filter((s) => (counts.get(s.source_id.toLowerCase()) || 0) === 0).length;
  });

  readonly filteredSources = computed(() => {
    const query = this.searchPortal().toLowerCase().trim();
    const filter = this.portalFilter();
    const counts = this.sourceCounts();

    return this.store.sources().filter((s) => {
      // 1. Filtro por texto
      if (query) {
        const matchCode = s.source_id.toLowerCase().includes(query);
        const matchName = s.name.toLowerCase().includes(query);
        if (!matchCode && !matchName) return false;
      }

      // 2. Filtro por disponibilidad de recursos
      const count = counts.get(s.source_id.toLowerCase()) || 0;
      if (filter === 'WITH_RESOURCES' && count === 0) return false;
      if (filter === 'PENDING' && count > 0) return false;

      return true;
    });
  });

  getSourceResourceCount(sourceId: string): number {
    return this.sourceCounts().get(sourceId.toLowerCase()) || 0;
  }

  filterBySource(sourceId: string): void {
    this.exploreSource.emit(sourceId);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchPortal.set(value);
  }

  clearSearch(): void {
    this.searchPortal.set('');
  }

  setPortalFilter(filter: 'ALL' | 'WITH_RESOURCES' | 'PENDING'): void {
    this.portalFilter.set(filter);
  }

  resetFilters(): void {
    this.searchPortal.set('');
    this.portalFilter.set('ALL');
  }
}
