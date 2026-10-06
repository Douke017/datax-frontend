import { Component, inject, signal, effect, OnInit } from '@angular/core';
import { InstitutionStateService, INSTITUTIONS } from '../../core/services/institution-state.service';
import { ReportesService } from '../../core/services/reportes.service';
import { ExecutionStateService, RecoveryStep } from '../../core/services/execution-state.service';
import { DetectedGap } from '../../core/models/audit.model';
import { GapBadgeComponent } from '../../shared/components/gap-badge/gap-badge.component';

const INITIAL_STEPS: RecoveryStep[] = [
  {
    step: 1,
    title: 'Identificación Legal',
    detail: 'Verificación del período normativo y catálogo de rutas oficiales esperadas.',
    status: 'PENDING'
  },
  {
    step: 2,
    title: 'Exploración en Hemerotecas',
    detail: 'Rastreo asistido en fuentes históricas, portales públicos y archivos digitales.',
    status: 'PENDING'
  },
  {
    step: 3,
    title: 'Verificación de Integridad',
    detail: 'Descarga controlada y comprobación de formato y firma de autenticidad.',
    status: 'PENDING'
  },
  {
    step: 4,
    title: 'Resguardo en Repositorio',
    detail: 'Almacenamiento seguro e inmutable en el repositorio de auditoría.',
    status: 'PENDING'
  }
];

@Component({
  selector: 'app-rescue-console',
  standalone: true,
  imports: [GapBadgeComponent],
  template: `
    <div class="rescue-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="badge-row">
            <span class="agent-tag">RECUPERACIÓN ASISTIDA</span>
            <span class="agent-sub">Búsqueda en Hemerotecas Digitales y Validación de Integridad</span>
          </div>
          <h1 class="page-title">Búsqueda y Recuperación de Documentos Extraviados</h1>
          <p class="page-desc">
            Localización de publicaciones financieras históricas ausentes en portales activos mediante exploración inteligente de hemerotecas y archivos públicos.
          </p>
        </div>
      </div>

      <!-- Controls -->
      <div class="section-card console-controls">
        <div class="control-row">
          <div class="control-group">
            <label class="control-label">Entidad Regulada</label>
            <select
              class="select-input"
              [value]="selectedSource()"
              (change)="onSourceChange($event)"
              [disabled]="executing()"
            >
              @for (inst of institutions; track inst.id) {
                <option [value]="inst.id">{{ inst.code }} — {{ inst.name }}</option>
              }
            </select>
          </div>

          <div class="control-group">
            <label class="control-label">Período Requerido (AAAA-MM)</label>
            <input
              type="text"
              class="text-input mono"
              [value]="selectedPeriod()"
              (input)="onPeriodInput($event)"
              placeholder="Ej. 2026-01"
              [disabled]="executing()"
            />
          </div>

          <div class="control-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                [checked]="autoInject()"
                (change)="onAutoInjectToggle($event)"
                [disabled]="executing()"
              />
              <span>Guardar automáticamente en repositorio local</span>
            </label>
          </div>

          <div class="control-action">
            <button
              class="btn-primary btn-execute"
              (click)="executeRescue()"
              [disabled]="executing() || !selectedPeriod()"
            >
              @if (executing()) {
                <span>Localizando...</span>
              } @else {
                <span>Iniciar Búsqueda</span>
              }
            </button>
          </div>
        </div>

        <div class="quick-targets">
          <span class="quick-label">Períodos Faltantes Detectados:</span>
          <button class="quick-btn" (click)="setTarget('asfi', '2026-01')">ASFI 2026-01</button>
          <button class="quick-btn" (click)="setTarget('asfi', '2026-02')">ASFI 2026-02</button>
          <button class="quick-btn" (click)="setTarget('bcb', '2026-01')">BCB 2026-01</button>
          <button class="quick-btn" (click)="setTarget('bcb', '2025-12')">BCB 2025-12</button>
        </div>
      </div>

      <!-- Execution Pipeline Visualizer -->
      <div class="pipeline-card">
        <div class="pipeline-header">
          <span class="pipeline-title">Etapas del Proceso de Recuperación</span>
        </div>

        <div class="steps-container">
          @for (s of steps(); track s.step) {
            <div class="step-card" [class]="'status-' + s.status.toLowerCase()">
              <div class="step-top">
                <span class="step-number">0{{ s.step }}</span>
                <span class="step-status">{{ formatStepStatus(s.status) }}</span>
              </div>
              <div class="step-name">{{ s.title }}</div>
              <div class="step-detail">{{ s.detail }}</div>
              @if (s.timestamp) {
                <span class="step-time">{{ s.timestamp }}</span>
              }
            </div>
          }
        </div>
      </div>

      <!-- Result Card -->
      @if (rescueResult(); as res) {
        <div class="result-card">
          <div class="result-header">
            <div>
              <div class="result-tag-row">
                <span class="result-tag">RESULTADO DE LA BÚSQUEDA</span>
                @if (lastExecutedTimestamp(); as ts) {
                  <span class="result-time mono">Registrado: {{ formatTimestamp(ts) }}</span>
                }
              </div>
              <h3 class="result-title">{{ res.expected_filing.target_filename }}</h3>
            </div>
            <div class="header-result-actions">
              <app-gap-badge [status]="res.status" />
              <button class="btn-clear-result" (click)="resetConsole()" title="Limpiar resultado guardado">Reiniciar</button>
            </div>
          </div>

          <div class="result-body">
            @if (res.rescued_asset; as asset) {
              <div class="metrics-row">
                <div class="res-item">
                  <span class="res-lbl">{{ asset.digest.length === 64 ? 'Firma Criptográfica SHA-256' : 'Firma de Preservación Digital' }}</span>
                  <span class="res-val mono">{{ asset.digest }}</span>
                </div>
                <div class="res-item">
                  <span class="res-lbl">Tamaño del Archivo</span>
                  <span class="res-val mono">{{ formatBytes(asset.content_length) }}</span>
                </div>
                <div class="res-item">
                  <span class="res-lbl">Formato Verificado</span>
                  <span class="res-val mono">{{ asset.mimetype }}</span>
                </div>
                <div class="res-item">
                  <span class="res-lbl">Fecha de Registro</span>
                  <span class="res-val mono">{{ asset.capture_timestamp }}</span>
                </div>
              </div>

              <div class="res-detail-block">
                <span class="res-lbl">Ubicación del Documento Resguardado</span>
                <a [href]="asset.archive_url" target="_blank" class="res-link">{{ asset.archive_url }}</a>
              </div>

              <div class="res-detail-block">
                <span class="res-lbl">Informe de Localización y Validación</span>
                <div class="reasoning-box">{{ asset.agent_reasoning }}</div>
              </div>

              @if (asset.search_citations && asset.search_citations.length > 0) {
                <div class="res-detail-block">
                  <span class="res-lbl">Fuentes y Referencias Consultadas</span>
                  <div class="citations-list">
                    @for (cite of asset.search_citations; track cite) {
                      <a [href]="cite" target="_blank" class="citation-chip">{{ cite }}</a>
                    }
                  </div>
                </div>
              }
            } @else {
              <div class="no-asset-box">
                <p>La búsqueda finalizó sin localizar una copia íntegra con formato verificable.</p>
                <p class="notes-text">{{ res.notes }}</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .rescue-page {
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
    .agent-tag {
      background: var(--purple-bg);
      color: #c084fc;
      border: 1px solid var(--purple-border);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .agent-sub {
      font-size: 11px;
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
    .section-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 20px;
    }
    .control-row {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      flex-wrap: wrap;
    }
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .control-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      text-transform: uppercase;
    }
    .select-input, .text-input {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 8px 12px;
      color: var(--text-main);
      font-size: 13px;
      height: 38px;
    }
    .select-input:focus, .text-input:focus {
      outline: none;
      border-color: var(--border-focus);
    }
    .text-input.mono {
      font-family: var(--font-mono);
    }
    .checkbox-group {
      justify-content: flex-end;
      height: 38px;
      display: flex;
      align-items: center;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
    }
    .btn-execute {
      height: 38px;
      padding: 0 20px;
      font-weight: 600;
    }
    .quick-targets {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }
    .quick-label {
      font-size: 11px;
      color: var(--text-subtle);
      font-weight: 600;
    }
    .quick-btn {
      background: var(--bg-surface-elevated);
      color: #93c5fd;
      border: 1px solid var(--border-subtle);
      padding: 3px 8px;
      font-size: 11px;
      font-family: var(--font-mono);
      cursor: pointer;
      border-radius: 3px;
    }
    .quick-btn:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-medium);
    }

    /* Pipeline visualizer */
    .pipeline-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 20px;
    }
    .pipeline-header {
      margin-bottom: 16px;
    }
    .pipeline-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .steps-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    @media (max-width: 900px) {
      .steps-container {
        grid-template-columns: 1fr;
      }
    }
    .step-card {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .step-card.status-running {
      border-color: #3b82f6;
      background: rgba(37, 99, 235, 0.05);
    }
    .step-card.status-completed {
      border-color: var(--success);
      background: rgba(16, 185, 129, 0.05);
    }
    .step-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .step-number {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      color: var(--text-subtle);
    }
    .step-status {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 2px;
      text-transform: uppercase;
    }
    .status-pending .step-status { background: var(--bg-surface-elevated); color: var(--text-subtle); }
    .status-running .step-status { background: rgba(37, 99, 235, 0.2); color: #60a5fa; }
    .status-completed .step-status { background: var(--success-bg); color: #34d399; }
    .status-failed .step-status { background: var(--danger-bg); color: #f87171; }
    .step-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-main);
    }
    .step-detail {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.3;
    }
    .step-time {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-subtle);
      margin-top: 4px;
    }

    /* Result */
    .result-card {
      background: var(--bg-surface);
      border: 1px solid var(--purple-border);
      border-radius: var(--radius-md);
      padding: 20px;
    }
    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 12px;
      margin-bottom: 16px;
      gap: 12px;
    }
    .result-tag-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }
    .result-tag {
      font-size: 10px;
      font-weight: 700;
      color: #c084fc;
      letter-spacing: 0.08em;
    }
    .result-time {
      font-size: 11px;
      color: var(--text-muted);
    }
    .header-result-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-clear-result {
      background: transparent;
      border: 1px solid var(--border-subtle);
      color: var(--text-subtle);
      font-size: 11px;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .btn-clear-result:hover {
      background: var(--bg-surface-elevated);
      color: var(--text-main);
    }
    .result-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
      font-family: var(--font-mono);
    }
    .result-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      background: var(--bg-app);
      padding: 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }
    .res-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .res-lbl {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-subtle);
      text-transform: uppercase;
    }
    .res-val {
      font-size: 12px;
      color: var(--text-main);
    }
    .res-val.mono {
      font-family: var(--font-mono);
      word-break: break-all;
    }
    .res-detail-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .res-link {
      font-family: var(--font-mono);
      font-size: 12px;
      color: #60a5fa;
      word-break: break-all;
    }
    .reasoning-box {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 12px;
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .citations-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .citation-chip {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      padding: 4px 8px;
      border-radius: 3px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: #93c5fd;
      text-decoration: none;
    }
    .citation-chip:hover {
      border-color: var(--primary);
      text-decoration: underline;
    }
    .no-asset-box {
      background: var(--danger-bg);
      border: 1px solid var(--danger-border);
      padding: 16px;
      border-radius: var(--radius-sm);
      color: #f87171;
      font-size: 13px;
    }
    .notes-text {
      margin-top: 6px;
      font-size: 12px;
      color: var(--text-muted);
    }
  `]
})
export class RescueConsoleComponent implements OnInit {
  private readonly instState = inject(InstitutionStateService);
  private readonly reportesService = inject(ReportesService);
  private readonly executionState = inject(ExecutionStateService);

  readonly institutions = INSTITUTIONS;
  readonly selectedSource = signal<string>('asfi');
  readonly selectedPeriod = signal<string>('2026-01');
  readonly autoInject = signal<boolean>(true);

  readonly executing = signal<boolean>(false);
  readonly rescueResult = signal<DetectedGap | null>(null);
  readonly lastExecutedTimestamp = signal<string | null>(null);

  readonly steps = signal<RecoveryStep[]>(INITIAL_STEPS);

  constructor() {
    effect(() => {
      const activeId = this.instState.currentInstitutionId();
      if (activeId !== this.selectedSource()) {
        this.selectedSource.set(activeId);
        this.restoreExecutionForSource(activeId);
      }
    });
  }

  ngOnInit(): void {
    const currentId = this.instState.currentInstitutionId();
    this.selectedSource.set(currentId);
    this.restoreExecutionForSource(currentId);
  }

  onSourceChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedSource.set(val);
    this.instState.setInstitution(val);
  }

  onPeriodInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.selectedPeriod.set(val);
  }

  onAutoInjectToggle(event: Event): void {
    const val = (event.target as HTMLInputElement).checked;
    this.autoInject.set(val);
  }

  setTarget(source: string, period: string): void {
    this.selectedSource.set(source);
    this.selectedPeriod.set(period);
    this.instState.setInstitution(source);
  }

  executeRescue(): void {
    const sourceId = this.selectedSource();
    const period = this.selectedPeriod();
    if (!sourceId || !period) return;

    this.executing.set(true);
    this.rescueResult.set(null);
    this.lastExecutedTimestamp.set(null);

    this.updateStep(1, 'RUNNING', 'Resolviendo requisitos normativos para el período ' + period);

    setTimeout(() => {
      this.updateStep(1, 'COMPLETED', 'Período normativo identificado.');
      this.updateStep(2, 'RUNNING', 'Explorando hemerotecas y repositorios abiertos...');
    }, 400);

    this.reportesService
      .rescueGap({
        source_id: sourceId,
        period_label: period,
        auto_inject: this.autoInject()
      })
      .subscribe({
        next: (gap) => {
          this.executing.set(false);
          this.rescueResult.set(gap);

          if (gap.status === 'RESCUED_ARCHIVE' && gap.rescued_asset) {
            this.updateStep(2, 'COMPLETED', 'Documento localizado en repositorio o archivo histórico.');
            this.updateStep(3, 'COMPLETED', `Formato (${gap.rescued_asset.mimetype}) y firma verificados.`);
            this.updateStep(4, 'COMPLETED', 'Documento resguardado e inyectado al repositorio.');
          } else {
            this.updateStep(2, 'FAILED', 'No se localizó una copia íntegra con formato verificable.');
            this.updateStep(3, 'FAILED', 'Verificación no aplicable (sin documento fuente).');
            this.updateStep(4, 'FAILED', 'No resguardado en almacén de auditoría.');
          }

          // Persistir estado de ejecución completo
          this.executionState.saveRescueExecution(sourceId, {
            gap,
            steps: this.steps(),
            period
          });
          this.lastExecutedTimestamp.set(new Date().toISOString());
        },
        error: (err) => {
          this.executing.set(false);
          this.updateStep(2, 'FAILED', 'No se pudo completar la recuperación: ' + (err.message || 'Error de conexión'));
          this.updateStep(3, 'FAILED', 'Verificación interrumpida.');
          this.updateStep(4, 'FAILED', 'Operación cancelada.');

          if (this.rescueResult()) {
            this.executionState.saveRescueExecution(sourceId, {
              gap: this.rescueResult()!,
              steps: this.steps(),
              period
            });
          }
        }
      });
  }

  resetConsole(): void {
    const sourceId = this.selectedSource();
    this.executionState.clearRescueExecution(sourceId);
    this.resetSteps();
    this.rescueResult.set(null);
    this.lastExecutedTimestamp.set(null);
  }

  formatStepStatus(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'RUNNING':
        return 'En Proceso';
      case 'COMPLETED':
        return 'Completado';
      case 'FAILED':
        return 'Interrumpido';
      default:
        return status;
    }
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatTimestamp(isoString: string): string {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-BO', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  }

  private restoreExecutionForSource(sourceId: string): void {
    const saved = this.executionState.getRescueExecution(sourceId);
    if (saved) {
      this.selectedPeriod.set(saved.period);
      this.steps.set(saved.steps);
      this.rescueResult.set(saved.gap);
      this.lastExecutedTimestamp.set(saved.timestamp);
    } else {
      this.resetSteps();
      this.rescueResult.set(null);
      this.lastExecutedTimestamp.set(null);
    }
  }

  private resetSteps(): void {
    this.steps.set(INITIAL_STEPS.map((s) => ({ ...s })));
  }

  private updateStep(stepNum: number, status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED', detail: string): void {
    this.steps.update((items) =>
      items.map((s) =>
        s.step === stepNum
          ? { ...s, status, detail, timestamp: new Date().toLocaleTimeString() }
          : s
      )
    );
  }
}

