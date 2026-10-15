import { Component, inject } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ExternoStore } from '../externo.store';
import { CatalogSource } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-externo-overview',
  standalone: true,
  imports: [SlicePipe],
  template: `
    <div class="overview-container">
      <!-- KPI Stats Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">PORTALES VIGILADOS</span>
            <span class="kpi-badge badge-success">ACTIVOS</span>
          </div>
          <div class="kpi-value">{{ store.activeSourcesCount() }} / {{ store.sources().length }}</div>
          <div class="kpi-caption">Entidades financieras y reguladas monitoreadas</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">PUBLICACIONES DETECTADAS</span>
            <span class="kpi-badge badge-info">INDEXADAS</span>
          </div>
          <div class="kpi-value">{{ store.totalDiscovered() }}</div>
          <div class="kpi-caption">Documentos e informes localizados en portales</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">DOCUMENTOS PDF</span>
            <span class="kpi-badge badge-purple">MEMORIAS Y BALANCES</span>
          </div>
          <div class="kpi-value">{{ store.kpiSummary().pdfCount }}</div>
          <div class="kpi-caption">Publicaciones oficiales en formato documental</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-title">HOJAS DE CÁLCULO</span>
            <span class="kpi-badge badge-warning">SERIES ESTADÍSTICAS</span>
          </div>
          <div class="kpi-value">{{ store.kpiSummary().excelCount }}</div>
          <div class="kpi-caption">Tablas de indicadores, tasas y carteras (.xlsx / .csv)</div>
        </div>
      </div>

      <!-- Sources Section -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Portales Institucionales Monitoreados</h2>
            <p class="section-desc">Fuentes oficiales registradas para inspección periódica y detección de nuevos boletines.</p>
          </div>
          <span class="catalog-badge">CATÁLOGO ACTIVO</span>
        </div>

        <div class="sources-grid">
          @for (source of store.sources(); track source.source_id) {
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
                  <a [href]="source.entrypoint" target="_blank" rel="noopener noreferrer" class="detail-link">
                    {{ source.entrypoint }}
                  </a>
                </div>
                <div class="detail-row">
                  <span class="detail-lbl">Frecuencia de inspección:</span>
                  <span class="detail-val">{{ source.update_category === 'DAILY' ? 'Diaria' : 'Mensual' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-lbl">Último barrido registrado:</span>
                  <span class="detail-val mono">{{ source.last_run_at ? (source.last_run_at | slice:0:19) : 'Reciente' }}</span>
                </div>
              </div>

              <div class="source-actions">
                <button
                  type="button"
                  class="btn-source-filter"
                  [class.active]="store.selectedSourceId() === source.source_id"
                  (click)="filterBySource(source.source_id)"
                >
                  {{ store.selectedSourceId() === source.source_id ? 'Mostrando en Inventario' : 'Explorar Documentos' }}
                </button>
              </div>
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
    }
    .btn-source-filter {
      background: var(--bg-surface-elevated);
      color: var(--text-main);
      border: 1px solid var(--border-medium);
      padding: 5px 12px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-source-filter:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-focus);
    }
    .btn-source-filter.active {
      background: var(--primary);
      border-color: #1d4ed8;
      color: #ffffff;
    }
  `]
})
export class ExternoOverviewComponent {
  readonly store = inject(ExternoStore);

  filterBySource(sourceId: string): void {
    if (this.store.selectedSourceId() === sourceId) {
      this.store.setSourceFilter('ALL');
    } else {
      this.store.setSourceFilter(sourceId);
    }
  }
}
