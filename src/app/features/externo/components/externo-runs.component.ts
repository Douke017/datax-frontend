import { Component, inject } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ExternoStore } from '../externo.store';
import { RunReport } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-externo-runs',
  standalone: true,
  imports: [SlicePipe],
  template: `
    <div class="runs-container">
      <div class="runs-header">
        <div>
          <h2 class="runs-title">Auditoría de Barridos e Historial de Ejecuciones</h2>
          <p class="runs-desc">Registro histórico de inspecciones web automatizadas, cobertura de URLs y detección de cambios.</p>
        </div>
        <span class="badge-runs">REGISTRO INMUTABLE</span>
      </div>

      @if (store.runs().length === 0) {
        <div class="empty-state">
          <span class="empty-title">Sin registros de ejecución recientes</span>
          <span class="empty-desc">Las observaciones de barridos web aparecerán aquí al completarse las inspecciones.</span>
        </div>
      } @else {
        <div class="runs-list">
          @for (run of store.runs(); track run.run_id) {
            <div class="run-card">
              <div class="run-top">
                <div class="run-meta">
                  <span class="run-id-tag mono">RUN ID: {{ run.run_id }}</span>
                  <div class="run-timestamps">
                    <span>Inicio: <strong class="mono">{{ run.started_at | slice:0:19 }}</strong></span>
                    <span>•</span>
                    <span>Fin: <strong class="mono">{{ run.finished_at | slice:0:19 }}</strong></span>
                  </div>
                </div>

                <div class="run-status-badge badge-success">
                  EJECUCIÓN EXITOSA
                </div>
              </div>

              <!-- Metrics Summary -->
              <div class="run-stats-grid">
                <div class="stat-box">
                  <span class="stat-lbl">PORTALES PROCESADOS</span>
                  <span class="stat-num">{{ run.sources_processed }} / {{ run.sources_selected }}</span>
                </div>
                <div class="stat-box">
                  <span class="stat-lbl">SIN NOVEDADES</span>
                  <span class="stat-num text-info">{{ run.sources_without_changes }}</span>
                </div>
                <div class="stat-box">
                  <span class="stat-lbl">CON CAMBIOS</span>
                  <span class="stat-num text-warning">{{ run.sources_with_changes }}</span>
                </div>
                <div class="stat-box">
                  <span class="stat-lbl">FALLAS DE ACCESO</span>
                  <span class="stat-num" [class.text-danger]="run.sources_failed > 0">{{ run.sources_failed }}</span>
                </div>
              </div>

              <!-- Source Breakdown -->
              <div class="source-results">
                <span class="breakdown-title">DESGLOSE DE COBERTURA POR ENTIDAD:</span>
                <div class="results-table-container">
                  <table class="results-table">
                    <thead>
                      <tr>
                        <th>Entidad</th>
                        <th>Flujo Web</th>
                        <th>Páginas Inspeccionadas</th>
                        <th>URLs Descubiertas</th>
                        <th>Documentos Hallados</th>
                        <th>Estado de Contenido</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (res of run.source_results; track res.observation_id) {
                        <tr>
                          <td class="mono font-bold">{{ res.source_id.toUpperCase() }}</td>
                          <td>{{ res.workflow }}</td>
                          <td class="mono">{{ res.coverage.pages_visited }}</td>
                          <td class="mono">{{ res.coverage.urls_discovered }}</td>
                          <td class="mono text-highlight">{{ res.coverage.resources_found }}</td>
                          <td>
                            <span class="badge-status-content" [class.no-change]="res.content_status === 'NO_CHANGE'">
                              {{ res.content_status === 'NO_CHANGE' ? 'SIN MODIFICACIÓN' : 'ACTUALIZADO' }}
                            </span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .runs-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .runs-header {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .runs-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }
    .runs-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .badge-runs {
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
      border: 1px solid var(--border-medium);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
    }
    .runs-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .run-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      transition: border-color 0.15s ease;
    }
    .run-card:hover {
      border-color: var(--border-medium);
    }
    .run-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .run-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .run-id-tag {
      font-size: 12px;
      font-weight: 700;
      color: #60a5fa;
      letter-spacing: 0.03em;
    }
    .run-timestamps {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .run-status-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 3px;
      font-family: var(--font-mono);
      letter-spacing: 0.04em;
    }
    .run-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .stat-box {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-lbl {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-subtle);
      letter-spacing: 0.04em;
    }
    .stat-num {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
      font-family: var(--font-mono);
    }
    .text-info {
      color: #38bdf8;
    }
    .text-warning {
      color: #fbbf24;
    }
    .text-danger {
      color: #f87171;
    }
    .text-highlight {
      color: #60a5fa;
      font-weight: 700;
    }
    .font-bold {
      font-weight: 700;
    }
    .source-results {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .breakdown-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-subtle);
      letter-spacing: 0.05em;
    }
    .results-table-container {
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      overflow-x: auto;
    }
    .results-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }
    .results-table th {
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-medium);
    }
    .results-table td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-main);
    }
    .badge-status-content {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--font-mono);
    }
    .badge-status-content.no-change {
      background: rgba(59, 130, 246, 0.1);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.25);
    }
    .empty-state {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 40px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .empty-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
    }
    .empty-desc {
      font-size: 12px;
      color: var(--text-subtle);
    }
    .mono {
      font-family: var(--font-mono);
    }
  `]
})
export class ExternoRunsComponent {
  readonly store = inject(ExternoStore);
}
