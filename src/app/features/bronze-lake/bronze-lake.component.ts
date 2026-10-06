import { Component, inject, signal, effect, OnInit, computed } from '@angular/core';
import { InternoService } from '../../core/services/interno.service';
import { BridgeReconcileResponse, BronzeArtifactEntry } from '../../core/models/reconciliation.model';
import { InstitutionStateService, INSTITUTIONS } from '../../core/services/institution-state.service';
import { ExecutionStateService } from '../../core/services/execution-state.service';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';

@Component({
  selector: 'app-bronze-lake',
  standalone: true,
  imports: [KpiCardComponent],
  template: `
    <div class="bronze-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="badge-row">
            <span class="source-tag">ALMACENAMIENTO INSTITUCIONAL</span>
            <span class="lake-badge">CAPA BRONZE · FILESYSTEM LOCAL</span>
          </div>
          <h1 class="page-title">Gestión de Almacenamiento Local y Descargas</h1>
          <p class="page-desc">
            Custodia física, cálculo de hash criptográfico SHA-256 en vuelo y catálogo inmutable de publicaciones descargadas.
          </p>
        </div>

        <div class="header-actions">
          <button
            class="btn-secondary"
            (click)="refreshAll()"
            [disabled]="reconciling() || syncing()"
          >
            @if (reconciling()) {
              <span>Verificando...</span>
            } @else {
              <span>Verificar Estado</span>
            }
          </button>

          <button
            class="btn-primary"
            (click)="runSyncBatch()"
            [disabled]="syncing() || reconciling()"
          >
            @if (syncing()) {
              <span>Descargando Lote...</span>
            } @else {
              <span>Descargar Lote de Archivos</span>
            }
          </button>
        </div>
      </div>

      <!-- Scope Explanation Banner -->
      <div class="scope-banner">
        <div class="scope-icon">INFO</div>
        <div class="scope-content">
          <div class="scope-title">Ámbito Operativo: Ingesta Técnica a Capa Bronze</div>
          <div class="scope-text">
            Este módulo opera a nivel de almacenamiento físico: descarga los recursos web descubiertos en el portal institucional hacia el sistema de archivos del servidor (<code>data/bronze/</code>), garantizando inmutabilidad mediante renombrado atómico y verificación SHA-256. Para auditar el cumplimiento del calendario normativo exigido por la ASFI, acceda a la sección <strong>Auditoría de Publicaciones</strong>.
          </div>
        </div>
      </div>

      <!-- Controls Bar -->
      <div class="controls-bar">
        <div class="control-item">
          <span class="control-lbl">Entidad:</span>
          <select
            class="select-input"
            [value]="instState.currentInstitutionId()"
            (change)="onInstitutionChange($event)"
            [disabled]="reconciling() || syncing()"
          >
            @for (inst of institutions; track inst.id) {
              <option [value]="inst.id">{{ inst.code }} — {{ inst.name }}</option>
            }
          </select>
        </div>

        <div class="control-item">
          <span class="control-lbl">Descarga por Lote:</span>
          <select
            class="select-input"
            [value]="batchSize()"
            (change)="onBatchSizeChange($event)"
            [disabled]="syncing()"
          >
            <option [value]="5">5 Archivos</option>
            <option [value]="10">10 Archivos</option>
            <option [value]="25">25 Archivos</option>
            <option [value]="50">50 Archivos</option>
          </select>
        </div>

        <div class="control-item filter-search">
          <span class="control-lbl">Buscar en Repositorio:</span>
          <input
            type="text"
            class="search-input"
            placeholder="Filtrar por archivo, periodo o hash..."
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
          />
        </div>
      </div>

      <!-- Reconciliation KPIs -->
      @if (diffResult(); as diff) {
        <div class="kpi-grid">
          <app-kpi-card
            title="Recursos Detectados en Web"
            [value]="diff.total_external_resources"
            subtitle="Total de enlaces identificados en el portal oficial"
            tone="default"
          />
          <app-kpi-card
            title="Archivos en Almacén Local"
            [value]="diff.total_confirmed"
            subtitle="Custodiados en disco con firma digital verificada"
            tone="success"
            badgeText="LOCAL"
          />
          <app-kpi-card
            title="Pendientes de Descarga"
            [value]="diff.total_new"
            subtitle="Descubiertos en portal, pendientes de copia a disco"
            tone="warning"
            badgeText="PENDIENTE"
          />
          <app-kpi-card
            title="Actualizados en Origen"
            [value]="diff.total_modified"
            subtitle="Archivos con cambio de versión o timestamp"
            tone="info"
            badgeText="REVISIÓN"
          />
        </div>

        <div class="diff-summary-box">
          <span class="summary-lbl">ESTADO DE CONCILIACIÓN:</span>
          <span class="summary-msg">{{ diff.summary_message }}</span>
        </div>
      }

      <!-- Sync Result Output (Persisted Across Refreshes) -->
      @if (currentSyncRecord(); as record) {
        <div class="sync-report-card">
          <div class="report-header">
            <div class="report-header-left">
              <span class="report-tag">INFORME DE ÚLTIMA DESCARGA Y RESGUARDO</span>
              <span class="report-time mono">Registrado: {{ formatDate(record.timestamp) }}</span>
            </div>
            <div class="report-header-right">
              <span class="plan-id mono">Referencia: {{ record.data.plan_id }}</span>
              <button class="btn-dismiss" (click)="dismissSyncReport()" title="Descartar este informe">Cerrar</button>
            </div>
          </div>

          <div class="report-stats">
            <div class="stat-col">
              <span class="stat-lbl">Archivos Procesados</span>
              <span class="stat-val mono">{{ record.data.total_tasks }}</span>
            </div>
            <div class="stat-col">
              <span class="stat-lbl">Descargados Exitosamente</span>
              <span class="stat-val mono text-success">{{ record.data.completed_tasks }}</span>
            </div>
            <div class="stat-col">
              <span class="stat-lbl">Rechazados / Incompletos</span>
              <span class="stat-val mono text-danger">{{ record.data.failed_tasks }}</span>
            </div>
            <div class="stat-col">
              <span class="stat-lbl">Estado de Ejecución</span>
              <span class="stat-val mono text-info">{{ record.data.is_executed ? 'COMPLETADO' : 'SIMULADO' }}</span>
            </div>
          </div>

          <div class="report-summary-text">
            {{ record.data.summary }}
          </div>
        </div>
      }

      <!-- Physical Artifacts Inventory Table -->
      <div class="section-card">
        <div class="section-header">
          <div>
            <h2 class="section-title">Inventario de Archivos Custodiados en Almacén Local</h2>
            <p class="section-desc">
              Archivos físicos preservados en <code>data/bronze/</code> con firma SHA-256 e integridad inmutable.
            </p>
          </div>
          <div class="inventory-badge">
            {{ filteredArtifacts().length }} archivos en custodia
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Período / Referencia</th>
                <th>Dominio de Origen</th>
                <th>Ubicación en Servidor</th>
                <th>Tamaño</th>
                <th>Firma Criptográfica SHA-256</th>
                <th>Fecha y Hora de Descarga</th>
                <th style="text-align: right;">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (art of filteredArtifacts(); track art.artifact_id) {
                <tr>
                  <td>
                    <div class="period-cell">
                      <span class="period-badge">{{ art.period || 'GENERAL' }}</span>
                      <span class="dataset-lbl mono">{{ art.dataset_code }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="domain-tag mono">{{ art.domain }}</span>
                  </td>
                  <td>
                    <span class="path-text mono" [title]="art.file_path">{{ art.file_path }}</span>
                  </td>
                  <td>
                    <span class="size-text mono">{{ formatBytes(art.size_bytes) }}</span>
                  </td>
                  <td>
                    <div class="hash-box" [title]="art.sha256_hash">
                      <span class="hash-text mono">{{ art.sha256_hash.slice(0, 16) }}...</span>
                    </div>
                  </td>
                  <td>
                    <span class="date-text">{{ formatDate(art.downloaded_at) }}</span>
                  </td>
                  <td style="text-align: right;">
                    <span class="status-pill status-verified">VERIFICADO</span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="empty-state">
                    @if (loadingArtifacts()) {
                      <span>Consultando catálogo físico en disco...</span>
                    } @else {
                      <span>No se encontraron archivos descargados en el repositorio local para el filtro seleccionado.</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bronze-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
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
    .lake-badge {
      font-size: 10px;
      font-weight: 700;
      color: #fbbf24;
      background: var(--warning-bg);
      border: 1px solid var(--warning-border);
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
    }
    .scope-banner {
      display: flex;
      gap: 14px;
      background: rgba(30, 58, 138, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: var(--radius-md);
      padding: 14px 18px;
      align-items: flex-start;
    }
    .scope-icon {
      font-size: 11px;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      letter-spacing: 0.05em;
    }
    .scope-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .scope-title {
      font-size: 13px;
      font-weight: 700;
      color: #93c5fd;
    }
    .scope-text {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .scope-text code {
      background: var(--bg-app);
      padding: 1px 5px;
      border-radius: 3px;
      color: #e2e8f0;
      font-family: monospace;
    }
    .controls-bar {
      display: flex;
      align-items: center;
      gap: 20px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      flex-wrap: wrap;
    }
    .control-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .filter-search {
      flex: 1;
      min-width: 260px;
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
      padding: 6px 12px;
      color: var(--text-main);
      font-size: 12px;
    }
    .search-input {
      width: 100%;
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      color: var(--text-main);
      font-size: 12px;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--primary);
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .diff-summary-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .summary-lbl {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-subtle);
      letter-spacing: 0.05em;
    }
    .summary-msg {
      font-size: 13px;
      font-weight: 600;
      color: #93c5fd;
    }
    .sync-report-card {
      background: var(--bg-surface);
      border: 1px solid var(--success-border);
      border-radius: var(--radius-md);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 10px;
      gap: 12px;
      flex-wrap: wrap;
    }
    .report-header-left, .report-header-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .report-tag {
      font-size: 11px;
      font-weight: 700;
      color: #34d399;
      letter-spacing: 0.05em;
    }
    .report-time {
      font-size: 11px;
      color: var(--text-muted);
    }
    .plan-id {
      font-size: 11px;
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
    .report-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      background: var(--bg-app);
      padding: 12px;
      border-radius: var(--radius-sm);
    }
    .stat-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .stat-lbl {
      font-size: 10px;
      color: var(--text-subtle);
      font-weight: 600;
      text-transform: uppercase;
    }
    .stat-val {
      font-size: 18px;
      font-weight: 700;
    }
    .text-success { color: #34d399; }
    .text-danger { color: #f87171; }
    .text-info { color: #38bdf8; }
    .report-summary-text {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
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
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }
    .section-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .section-desc code {
      background: var(--bg-app);
      padding: 1px 4px;
      border-radius: 3px;
      color: #93c5fd;
      font-family: monospace;
    }
    .inventory-badge {
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
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .data-table th {
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      border-bottom: 1px solid var(--border-subtle);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .data-table td {
      padding: 12px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-main);
      vertical-align: middle;
    }
    .data-table tbody tr:hover {
      background: var(--bg-surface-elevated);
    }
    .period-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .period-badge {
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
    }
    .dataset-lbl {
      font-size: 10px;
      color: var(--text-subtle);
    }
    .domain-tag {
      font-size: 11px;
      background: var(--bg-app);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--border-subtle);
      color: #cbd5e1;
    }
    .path-text {
      font-size: 11px;
      color: var(--text-muted);
      max-width: 280px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-block;
    }
    .size-text {
      font-size: 11px;
      color: var(--text-main);
      font-weight: 600;
    }
    .hash-box {
      cursor: help;
    }
    .hash-text {
      font-size: 11px;
      color: #a78bfa;
      background: rgba(167, 139, 250, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(167, 139, 250, 0.2);
    }
    .date-text {
      font-size: 11px;
      color: var(--text-muted);
    }
    .status-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      letter-spacing: 0.04em;
    }
    .status-verified {
      color: #34d399;
      background: rgba(52, 211, 153, 0.12);
      border: 1px solid rgba(52, 211, 153, 0.25);
    }
    .empty-state {
      text-align: center;
      padding: 30px;
      color: var(--text-subtle);
      font-size: 13px;
    }
  `]
})
export class BronzeLakeComponent implements OnInit {
  readonly instState = inject(InstitutionStateService);
  private readonly internoService = inject(InternoService);
  private readonly executionState = inject(ExecutionStateService);

  readonly institutions = INSTITUTIONS;
  readonly batchSize = signal<number>(10);
  readonly searchTerm = signal<string>('');
  readonly reconciling = signal<boolean>(false);
  readonly syncing = signal<boolean>(false);
  readonly loadingArtifacts = signal<boolean>(false);

  readonly diffResult = signal<BridgeReconcileResponse | null>(null);
  readonly artifacts = signal<BronzeArtifactEntry[]>([]);

  readonly currentSyncRecord = computed(() => {
    return this.executionState.getSyncReport(this.instState.currentInstitutionId());
  });

  readonly filteredArtifacts = computed(() => {
    const list = this.artifacts();
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return list;
    return list.filter(
      (a) =>
        a.file_path.toLowerCase().includes(term) ||
        (a.period && a.period.toLowerCase().includes(term)) ||
        a.sha256_hash.toLowerCase().includes(term) ||
        a.dataset_code.toLowerCase().includes(term) ||
        a.domain.toLowerCase().includes(term)
    );
  });

  constructor() {
    effect(() => {
      const sourceId = this.instState.currentInstitutionId();
      if (sourceId) {
        this.refreshAll();
      }
    });
  }

  ngOnInit(): void {
    this.refreshAll();
  }

  onInstitutionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.instState.setInstitution(val);
  }

  onBatchSizeChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.batchSize.set(val);
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
  }

  refreshAll(): void {
    this.runReconciliation();
    this.loadArtifacts();
  }

  runReconciliation(): void {
    const sourceId = this.instState.currentInstitutionId();
    this.reconciling.set(true);

    this.internoService
      .reconcile({
        source_id: sourceId
      })
      .subscribe({
        next: (data) => {
          this.diffResult.set(data);
          this.reconciling.set(false);
        },
        error: () => {
          this.reconciling.set(false);
        }
      });
  }

  loadArtifacts(): void {
    const sourceId = this.instState.currentInstitutionId();
    this.loadingArtifacts.set(true);

    this.internoService.getArtifacts(sourceId).subscribe({
      next: (data) => {
        this.artifacts.set(data);
        this.loadingArtifacts.set(false);
      },
      error: () => {
        this.loadingArtifacts.set(false);
      }
    });
  }

  runSyncBatch(): void {
    const sourceId = this.instState.currentInstitutionId();
    this.syncing.set(true);

    this.internoService
      .sync({
        source_id: sourceId,
        batch_size: this.batchSize(),
        execute_downloads: true
      })
      .subscribe({
        next: (data) => {
          this.executionState.saveSyncReport(sourceId, data);
          this.syncing.set(false);
          this.refreshAll();
        },
        error: () => {
          this.syncing.set(false);
        }
      });
  }

  dismissSyncReport(): void {
    this.executionState.clearSyncReport(this.instState.currentInstitutionId());
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDate(isoString: string): string {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-BO', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  }
}
