import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { InstitutionStateService } from '../../core/services/institution-state.service';
import { ExecutionStateService, RecoveryStep } from '../../core/services/execution-state.service';
import { ReportesService } from '../../core/services/reportes.service';
import { InternoService } from '../../core/services/interno.service';
import { DetectedGap, GapStatus, SourceAuditSummary } from '../../core/models/audit.model';
import { GapBadgeComponent } from '../../shared/components/gap-badge/gap-badge.component';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';

@Component({
  selector: 'app-audit-matrix',
  standalone: true,
  imports: [GapBadgeComponent, KpiCardComponent],
  template: `
    <div class="matrix-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="badge-row">
            <span class="inst-tag">{{ instState.getCurrentInstitution().code }}</span>
            <span class="inst-desc">{{ instState.getCurrentInstitution().name }}</span>
          </div>
          <h1 class="page-title">Auditoría de Publicaciones Obligatorias</h1>
          <p class="page-desc">
            Seguimiento cronológico del cumplimiento normativo y verificación de disponibilidad de informes periódicos.
          </p>
        </div>

        <div class="action-buttons">
          <button class="btn-secondary" (click)="loadAuditData()" [disabled]="loading()">
            Actualizar
          </button>
          <button class="btn-primary" (click)="triggerAudit()" [disabled]="reconciling() || loading()">
            @if (reconciling()) {
              <span>Auditando Publicaciones...</span>
            } @else {
              <span>Auditar Publicaciones</span>
            }
          </button>
        </div>
      </div>

      <!-- Scope Context Banner -->
      <div class="scope-banner">
        <div class="scope-icon">NORMATIVA</div>
        <div class="scope-content">
          <div class="scope-title">Ámbito de Cumplimiento: Calendario Regulatorio Oficial</div>
          <div class="scope-text">
            Esta matriz audita las <strong>obligaciones periódicas legales exigidas por la ASFI</strong> (ej. Memorias Anuales para la BBV, Balances Financieros para FINRURAL y Boletines Oficiales). Las "Pendientes de Descarga" representan obligaciones legales que están accesibles en el portal oficial pero aún no han sido resguardadas localmente. Para gestionar la descarga masiva de todos los recursos descubiertos, consulte la sección <strong>Gestión de Descargas</strong>.
          </div>
        </div>
      </div>

      <!-- Specific KPIs for active institution -->
      @if (auditSummary(); as summary) {
        <div class="kpi-grid">
          <app-kpi-card
            title="Publicaciones Requeridas"
            [value]="summary.metrics.total_expected"
            subtitle="Obligaciones según calendario normativo"
            tone="default"
          />
          <app-kpi-card
            title="En Almacén Local"
            [value]="summary.metrics.confirmed_online"
            subtitle="Publicaciones normativas custodiadas en disco"
            tone="success"
            badgeText="DISPONIBLE"
          />
          <app-kpi-card
            title="Pendientes de Descarga Local"
            [value]="summary.metrics.pending_ingestion"
            subtitle="Disponibles en web oficial, pendientes de copia local"
            tone="warning"
            badgeText="DESCARGA"
          />
          <app-kpi-card
            title="Documentos No Disponibles"
            [value]="summary.metrics.critical_gaps"
            subtitle="Enlaces oficiales caídos o ausentes de la web"
            tone="danger"
            badgeText="ATENCIÓN"
          />
        </div>
      }

      <!-- Filter & Search Bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-label">Estado:</span>
          <button
            class="filter-chip"
            [class.active]="selectedFilter() === 'ALL'"
            (click)="setFilter('ALL')"
          >
            Todos ({{ gaps().length }})
          </button>
          <button
            class="filter-chip chip-danger"
            [class.active]="selectedFilter() === 'CRITICAL_GAP'"
            (click)="setFilter('CRITICAL_GAP')"
          >
            No Disponibles ({{ countByStatus('CRITICAL_GAP') }})
          </button>
          <button
            class="filter-chip chip-warning"
            [class.active]="selectedFilter() === 'PENDING_INGESTION'"
            (click)="setFilter('PENDING_INGESTION')"
          >
            Pendientes ({{ countByStatus('PENDING_INGESTION') }})
          </button>
          <button
            class="filter-chip chip-success"
            [class.active]="selectedFilter() === 'CONFIRMED_ONLINE'"
            (click)="setFilter('CONFIRMED_ONLINE')"
          >
            Confirmados ({{ countByStatus('CONFIRMED_ONLINE') }})
          </button>
          <button
            class="filter-chip chip-purple"
            [class.active]="selectedFilter() === 'RESCUED_ARCHIVE'"
            (click)="setFilter('RESCUED_ARCHIVE')"
          >
            Recuperados ({{ countByStatus('RESCUED_ARCHIVE') }})
          </button>
        </div>

        <div class="search-box">
          <input
            type="text"
            placeholder="Buscar por período o nombre..."
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            class="search-input"
          />
        </div>
      </div>

      <!-- Main Audit Table with Pagination -->
      <div class="section-card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 100px;">Período</th>
                <th>Documento Obligatorio</th>
                <th style="width: 160px;">Estado</th>
                <th>Publicación Web Oficial</th>
                <th style="width: 130px;">Copia Local</th>
                <th style="width: 140px; text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (gap of pagedGaps(); track gap.gap_id) {
                <tr (click)="selectGap(gap)" class="clickable-row" [class.selected]="selectedGap()?.gap_id === gap.gap_id">
                  <td>
                    <span class="period-code">{{ gap.period_label }}</span>
                  </td>
                  <td>
                    <div class="target-file-box">
                      <span class="target-name">{{ gap.expected_filing.target_filename }}</span>
                      <span class="doc-type">{{ formatDocType(gap.document_type) }}</span>
                    </div>
                  </td>
                  <td>
                    <app-gap-badge [status]="gap.status" />
                  </td>
                  <td>
                    @if (gap.web_resource_url) {
                      <a [href]="gap.web_resource_url" target="_blank" class="web-link" (click)="$event.stopPropagation()">
                        {{ gap.web_resource_url }}
                      </a>
                    } @else {
                      <span class="text-subtle">No localizado en portal oficial</span>
                    }
                  </td>
                  <td>
                    @if (gap.bronze_confirmed) {
                      <span class="local-status confirmed">Resguardado</span>
                    } @else {
                      <span class="local-status pending">Pendiente</span>
                    }
                  </td>
                  <td style="text-align: right;">
                    @if (gap.status === 'CRITICAL_GAP') {
                      <button
                        class="btn-primary btn-sm"
                        (click)="rescueWithAgent(gap, $event)"
                        [disabled]="rescuingGapId() === gap.gap_id"
                      >
                        @if (rescuingGapId() === gap.gap_id) {
                          <span>Buscando...</span>
                        } @else {
                          <span>Recuperar</span>
                        }
                      </button>
                    } @else if (gap.status === 'PENDING_INGESTION') {
                      <button
                        class="btn-secondary btn-sm"
                        (click)="downloadToLocal(gap, $event)"
                        [disabled]="syncingGapId() === gap.gap_id"
                      >
                        @if (syncingGapId() === gap.gap_id) {
                          <span>Guardando...</span>
                        } @else {
                          <span>Descargar</span>
                        }
                      </button>
                    } @else {
                      <span class="action-done">Verificado</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="empty-state">
                    @if (loading()) {
                      <span>Consultando estado de publicaciones...</span>
                    } @else {
                      <span>No se encontraron publicaciones con los filtros aplicados.</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        @if (filteredGaps().length > pageSize) {
          <div class="pagination-bar">
            <span class="pagination-info">
              Mostrando {{ paginationStart() }} a {{ paginationEnd() }} de {{ filteredGaps().length }} registros
            </span>
            <div class="pagination-buttons">
              <button
                class="btn-page"
                [disabled]="currentPage() === 1"
                (click)="prevPage()"
              >
                Anterior
              </button>
              <span class="page-indicator">Página {{ currentPage() }} de {{ totalPages() }}</span>
              <button
                class="btn-page"
                [disabled]="currentPage() === totalPages()"
                (click)="nextPage()"
              >
                Siguiente
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Detail Drawer / Modal -->
      @if (selectedGap(); as gap) {
        <div class="detail-drawer">
          <div class="drawer-header">
            <div>
              <span class="drawer-tag">EXPEDIENTE DE PUBLICACIÓN</span>
              <h3 class="drawer-title">{{ gap.period_label }} — {{ gap.expected_filing.target_filename }}</h3>
            </div>
            <button class="btn-close" (click)="selectedGap.set(null)">Cerrar</button>
          </div>

          <div class="drawer-body">
            <div class="drawer-grid">
              <div class="drawer-field">
                <span class="field-label">Identificador</span>
                <span class="field-val mono">{{ gap.gap_id }}</span>
              </div>
              <div class="drawer-field">
                <span class="field-label">Estado de Cumplimiento</span>
                <app-gap-badge [status]="gap.status" />
              </div>
              <div class="drawer-field">
                <span class="field-label">Tipo de Publicación</span>
                <span class="field-val">{{ formatDocType(gap.document_type) }}</span>
              </div>
              <div class="drawer-field">
                <span class="field-label">Plazo Legal Máximo</span>
                <span class="field-val mono">{{ gap.expected_filing.legal_deadline_date || 'No especificado' }}</span>
              </div>
              <div class="drawer-field full-width">
                <span class="field-label">Rutas de Publicación Oficial Previstas</span>
                <div class="urls-list">
                  @for (url of gap.expected_filing.expected_urls; track url) {
                    <span class="mono-url">{{ url }}</span>
                  }
                </div>
              </div>
              <div class="drawer-field full-width">
                <span class="field-label">Diagnóstico de Auditoría</span>
                <p class="field-text">{{ gap.notes }}</p>
              </div>

              @if (gap.rescued_asset; as r) {
                <div class="drawer-field full-width rescue-report">
                  <span class="field-label text-purple">DOCUMENTO RECUPERADO DE FUENTE HISTÓRICA</span>
                  <div class="rescue-detail-box">
                    <div class="rescue-row">
                      <span class="rescue-lbl">Firma Digital (SHA-256):</span>
                      <span class="mono">{{ r.digest }}</span>
                    </div>
                    <div class="rescue-row">
                      <span class="rescue-lbl">Fuente de Recuperación:</span>
                      <a [href]="r.archive_url" target="_blank" class="mono-url">{{ r.archive_url }}</a>
                    </div>
                    <div class="rescue-row">
                      <span class="rescue-lbl">Informe de Localización:</span>
                      <p class="reasoning-text">{{ r.agent_reasoning }}</p>
                    </div>
                  </div>
                </div>
              }
            </div>

            <div class="drawer-actions">
              @if (gap.status === 'CRITICAL_GAP') {
                <button
                  class="btn-primary"
                  (click)="rescueWithAgent(gap)"
                  [disabled]="rescuingGapId() === gap.gap_id"
                >
                  @if (rescuingGapId() === gap.gap_id) {
                    <span>Buscando documento en hemerotecas...</span>
                  } @else {
                    <span>Iniciar Búsqueda y Recuperación</span>
                  }
                </button>
              } @else if (gap.status === 'PENDING_INGESTION') {
                <button
                  class="btn-primary"
                  (click)="downloadToLocal(gap)"
                  [disabled]="syncingGapId() === gap.gap_id"
                >
                  @if (syncingGapId() === gap.gap_id) {
                    <span>Descargando documento...</span>
                  } @else {
                    <span>Descargar a Repositorio Local</span>
                  }
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .matrix-page {
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
    .inst-tag {
      background: var(--bg-surface-elevated);
      color: #93c5fd;
      border: 1px solid var(--border-medium);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
    }
    .inst-desc {
      font-size: 12px;
      color: var(--text-subtle);
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
    .action-buttons {
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
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px 16px;
      gap: 12px;
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      text-transform: uppercase;
    }
    .filter-chip {
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-chip:hover {
      border-color: var(--border-medium);
      color: var(--text-main);
    }
    .filter-chip.active {
      background: var(--primary);
      border-color: #1d4ed8;
      color: #ffffff;
    }
    .search-input {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      color: var(--text-main);
      font-size: 12px;
      width: 260px;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--border-focus);
    }
    .section-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .clickable-row {
      cursor: pointer;
    }
    .clickable-row:hover td {
      background: var(--bg-surface-hover);
    }
    .clickable-row.selected td {
      background: rgba(37, 99, 235, 0.15);
      border-bottom-color: rgba(37, 99, 235, 0.4);
    }
    .period-code {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 12px;
      color: #93c5fd;
    }
    .target-file-box {
      display: flex;
      flex-direction: column;
    }
    .target-name {
      font-family: var(--font-mono);
      font-weight: 600;
      font-size: 12px;
      color: var(--text-main);
    }
    .doc-type {
      font-size: 11px;
      color: var(--text-subtle);
    }
    .web-link {
      font-family: var(--font-mono);
      font-size: 11px;
      color: #60a5fa;
      display: block;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .local-status {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 3px;
    }
    .local-status.confirmed {
      background: var(--success-bg);
      color: #34d399;
      border: 1px solid var(--success-border);
    }
    .local-status.pending {
      background: var(--bg-surface-elevated);
      color: var(--text-subtle);
      border: 1px solid var(--border-subtle);
    }
    .action-done {
      font-size: 11px;
      color: var(--text-subtle);
    }
    .empty-state {
      text-align: center;
      padding: 40px !important;
      color: var(--text-subtle);
      font-style: italic;
    }
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-surface);
    }
    .pagination-info {
      font-size: 12px;
      color: var(--text-subtle);
    }
    .pagination-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-page {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      padding: 4px 10px;
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
    .page-indicator {
      font-size: 12px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    /* Detail Drawer */
    .detail-drawer {
      background: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      padding: 20px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .drawer-tag {
      font-size: 10px;
      font-weight: 700;
      color: var(--primary);
      letter-spacing: 0.08em;
    }
    .drawer-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      font-family: var(--font-mono);
    }
    .btn-close {
      background: transparent;
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      padding: 4px 10px;
      font-size: 11px;
    }
    .btn-close:hover {
      background: var(--bg-surface-elevated);
      color: var(--text-main);
    }
    .drawer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .drawer-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .drawer-field.full-width {
      grid-column: 1 / -1;
    }
    .field-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      text-transform: uppercase;
    }
    .field-val {
      font-size: 13px;
      color: var(--text-main);
    }
    .field-val.mono {
      font-family: var(--font-mono);
    }
    .urls-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
    }
    .mono-url {
      font-family: var(--font-mono);
      font-size: 11px;
      background: var(--bg-app);
      padding: 4px 8px;
      border-radius: 3px;
      border: 1px solid var(--border-subtle);
      color: #93c5fd;
    }
    .field-text {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .rescue-report {
      border-top: 1px dashed var(--purple-border);
      padding-top: 12px;
      margin-top: 6px;
    }
    .text-purple { color: #c084fc; font-weight: 700; }
    .rescue-detail-box {
      background: var(--bg-app);
      border: 1px solid var(--purple-border);
      border-radius: var(--radius-sm);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 6px;
    }
    .rescue-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .rescue-lbl {
      font-size: 10px;
      color: var(--text-subtle);
      font-weight: 600;
    }
    .reasoning-text {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .drawer-actions {
      margin-top: 16px;
      border-top: 1px solid var(--border-subtle);
      padding-top: 14px;
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class AuditMatrixComponent implements OnInit {
  readonly instState = inject(InstitutionStateService);
  private readonly executionState = inject(ExecutionStateService);
  private readonly reportesService = inject(ReportesService);
  private readonly internoService = inject(InternoService);

  readonly auditSummary = signal<SourceAuditSummary | null>(null);
  readonly gaps = signal<DetectedGap[]>([]);
  readonly selectedFilter = signal<string>(this.executionState.auditFilter());
  readonly searchQuery = signal<string>('');
  readonly selectedGap = signal<DetectedGap | null>(null);

  readonly loading = signal<boolean>(false);
  readonly reconciling = signal<boolean>(false);
  readonly rescuingGapId = signal<string | null>(null);
  readonly syncingGapId = signal<string | null>(null);

  // Pagination
  readonly pageSize = 20;
  readonly currentPage = signal<number>(1);

  readonly filteredGaps = computed(() => {
    let list = this.gaps();
    const filter = this.selectedFilter();
    if (filter !== 'ALL') {
      list = list.filter((g) => g.status === filter);
    }
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(
        (g) =>
          g.period_label.toLowerCase().includes(q) ||
          g.expected_filing.target_filename.toLowerCase().includes(q) ||
          (g.web_resource_url && g.web_resource_url.toLowerCase().includes(q))
      );
    }
    return list;
  });

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredGaps().length / this.pageSize));
  });

  readonly pagedGaps = computed(() => {
    const list = this.filteredGaps();
    const start = (this.currentPage() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  readonly paginationStart = computed(() => {
    if (this.filteredGaps().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize + 1;
  });

  readonly paginationEnd = computed(() => {
    return Math.min(this.currentPage() * this.pageSize, this.filteredGaps().length);
  });

  constructor() {
    effect(() => {
      const sourceId = this.instState.currentInstitutionId();
      if (sourceId) {
        this.currentPage.set(1);
        this.loadAuditData();
      }
    });
  }

  ngOnInit(): void {
    this.loadAuditData();
  }

  loadAuditData(): void {
    const sourceId = this.instState.currentInstitutionId();
    this.loading.set(true);
    this.reportesService.getSourceAudit(sourceId).subscribe({
      next: (summary) => {
        this.auditSummary.set(summary);
        this.gaps.set(summary.gaps || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  triggerAudit(): void {
    const sourceId = this.instState.currentInstitutionId();
    this.reconciling.set(true);
    this.reportesService.reconcileThreeWay({ source_id: sourceId }).subscribe({
      next: (summary) => {
        this.auditSummary.set(summary);
        this.gaps.set(summary.gaps || []);
        this.reconciling.set(false);
      },
      error: () => {
        this.reconciling.set(false);
      }
    });
  }

  setFilter(filter: string): void {
    this.selectedFilter.set(filter);
    this.executionState.setAuditFilter(filter);
    this.currentPage.set(1);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.currentPage.set(1);
  }

  selectGap(gap: DetectedGap): void {
    this.selectedGap.set(gap);
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  countByStatus(status: GapStatus): number {
    return this.gaps().filter((g) => g.status === status).length;
  }

  formatDocType(type: string): string {
    switch (type) {
      case 'financial_bulletin':
        return 'Boletín Financiero';
      case 'monthly_bulletin':
        return 'Boletín Estadístico Mensual';
      case 'quarterly_financial_statements':
        return 'Estados Financieros Trimestrales';
      default:
        return type.replace(/_/g, ' ');
    }
  }

  rescueWithAgent(gap: DetectedGap, event?: Event): void {
    if (event) event.stopPropagation();
    this.rescuingGapId.set(gap.gap_id);

    this.reportesService
      .rescueGap({
        source_id: gap.source_id,
        period_label: gap.period_label,
        auto_inject: true
      })
      .subscribe({
        next: (updatedGap) => {
          this.rescuingGapId.set(null);
          this.gaps.update((current) =>
            current.map((g) => (g.gap_id === gap.gap_id ? updatedGap : g))
          );
          if (this.selectedGap()?.gap_id === gap.gap_id) {
            this.selectedGap.set(updatedGap);
          }

          // Sincronizar también con ExecutionStateService
          const step1: RecoveryStep = { step: 1, title: 'Identificación Legal', detail: 'Período normativo identificado.', status: 'COMPLETED' };
          const step2: RecoveryStep = { step: 2, title: 'Exploración en Hemerotecas', detail: updatedGap.status === 'RESCUED_ARCHIVE' ? 'Documento localizado en repositorio histórico.' : 'No localizado.', status: updatedGap.status === 'RESCUED_ARCHIVE' ? 'COMPLETED' : 'FAILED' };
          const step3: RecoveryStep = { step: 3, title: 'Verificación de Integridad', detail: updatedGap.rescued_asset ? `Formato (${updatedGap.rescued_asset.mimetype}) verificado.` : 'No aplicable.', status: updatedGap.status === 'RESCUED_ARCHIVE' ? 'COMPLETED' : 'FAILED' };
          const step4: RecoveryStep = { step: 4, title: 'Resguardo en Repositorio', detail: updatedGap.status === 'RESCUED_ARCHIVE' ? 'Documento resguardado.' : 'No resguardado.', status: updatedGap.status === 'RESCUED_ARCHIVE' ? 'COMPLETED' : 'FAILED' };

          this.executionState.saveRescueExecution(gap.source_id, {
            gap: updatedGap,
            steps: [step1, step2, step3, step4],
            period: gap.period_label
          });
        },
        error: () => {
          this.rescuingGapId.set(null);
        }
      });
  }

  downloadToLocal(gap: DetectedGap, event?: Event): void {
    if (event) event.stopPropagation();
    this.syncingGapId.set(gap.gap_id);

    this.internoService
      .sync({
        source_id: gap.source_id,
        batch_size: 1,
        execute_downloads: true
      })
      .subscribe({
        next: () => {
          this.syncingGapId.set(null);
          const updated: DetectedGap = {
            ...gap,
            status: 'CONFIRMED_ONLINE',
            bronze_confirmed: true,
            notes: 'Descargado y verificado en almacenamiento local'
          };
          this.gaps.update((current) =>
            current.map((g) => (g.gap_id === gap.gap_id ? updated : g))
          );
          if (this.selectedGap()?.gap_id === gap.gap_id) {
            this.selectedGap.set(updated);
          }

          // Actualizar conteos de KPI reactivamente
          this.auditSummary.update((current) => {
            if (!current) return current;
            return {
              ...current,
              metrics: {
                ...current.metrics,
                confirmed_online: current.metrics.confirmed_online + 1,
                pending_ingestion: Math.max(0, current.metrics.pending_ingestion - 1)
              }
            };
          });
        },
        error: () => {
          this.syncingGapId.set(null);
        }
      });
  }
}
