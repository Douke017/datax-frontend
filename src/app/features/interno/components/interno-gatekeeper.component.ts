import { Component, inject, signal } from '@angular/core';
import { InternoStore } from '../interno.store';
import { IngestionEvaluateRequest } from '../../../core/models/reconciliation.model';

@Component({
  selector: 'app-interno-gatekeeper',
  standalone: true,
  template: `
    <div class="gatekeeper-container">
      <!-- Context & Business Rules Banner -->
      <div class="rules-card">
        <div class="rules-header">
          <span class="rules-badge">CONTROL DE ADMISIÓN PREVENTIVO</span>
          <h2 class="rules-title">Pre-Flight Gatekeeper: Prevención de Redundancia y Tráfico Inútil</h2>
        </div>
        <p class="rules-desc">
          Mecanismo de control que intercepta toda solicitud de descarga antes de tocar la red externa.
          Evalúa en menos de 20 milisegundos si el documento ya se encuentra resguardado en el repositorio de custodia
          o si ya fue procesado en la información consolidada, garantizando cero saturación de los portales emisores.
        </p>

        <div class="rules-grid">
          <div class="rule-item">
            <span class="rule-num mono">01</span>
            <div class="rule-content">
              <span class="rule-name">Deduplicación Inmediata</span>
              <span class="rule-detail">Detecta si la firma del archivo ya existe en custodia física y devuelve el recurso al instante.</span>
            </div>
          </div>

          <div class="rule-item">
            <span class="rule-num mono">02</span>
            <div class="rule-content">
              <span class="rule-name">Protección de Concurrencia</span>
              <span class="rule-detail">Si dos analistas solicitan la misma publicación simultáneamente, se fusionan en una sola tarea en vuelo.</span>
            </div>
          </div>

          <div class="rule-item">
            <span class="rule-num mono">03</span>
            <div class="rule-content">
              <span class="rule-name">Excepción Regulatoria</span>
              <span class="rule-detail">Permite forzar la actualización únicamente ante auditorías expresas o requerimientos ASFI.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Interactive Playground -->
      <div class="playground-card">
        <div class="playground-header">
          <h3 class="playground-title">Simulador de Evaluación de Admisión</h3>
          <span class="playground-tag">EVALUACIÓN EN VIVO</span>
        </div>

        <!-- Presets Bar -->
        <div class="presets-bar">
          <span class="presets-lbl">Casos Típicos de Prueba:</span>
          <button type="button" class="btn-preset" (click)="applyPreset('bbv-cached')">
            Publicación BBV Resguardada (Caché Hit)
          </button>
          <button type="button" class="btn-preset" (click)="applyPreset('finrural-cached')">
            Estados Financieros FINRURAL (Caché Hit)
          </button>
          <button type="button" class="btn-preset" (click)="applyPreset('new-report')">
            Nuevo Documento No Resguardado (Permiso)
          </button>
          <button type="button" class="btn-preset" (click)="applyPreset('force-audit')">
            Actualización Forzada por Auditoría
          </button>
        </div>

        <!-- Evaluation Form -->
        <div class="eval-form-grid">
          <div class="form-group">
            <label class="form-lbl" for="ds-code">Código de Publicación:</label>
            <input
              id="ds-code"
              type="text"
              class="form-input mono"
              [value]="datasetCode()"
              (input)="datasetCode.set($any($event.target).value)"
              placeholder="Ej: DS_BO_BBV"
            />
          </div>

          <div class="form-group">
            <label class="form-lbl" for="domain">Portal / Dominio:</label>
            <input
              id="domain"
              type="text"
              class="form-input mono"
              [value]="domain()"
              (input)="domain.set($any($event.target).value)"
              placeholder="Ej: www.bbv.com.bo"
            />
          </div>

          <div class="form-group">
            <label class="form-lbl" for="period">Periodo Contable:</label>
            <input
              id="period"
              type="text"
              class="form-input mono"
              [value]="period()"
              (input)="period.set($any($event.target).value)"
              placeholder="Ej: 2026-08"
            />
          </div>

          <div class="form-group full-width">
            <label class="form-lbl" for="url">URL Objetivo:</label>
            <input
              id="url"
              type="text"
              class="form-input mono"
              [value]="targetUrl()"
              (input)="targetUrl.set($any($event.target).value)"
              placeholder="https://..."
            />
          </div>

          <div class="form-group full-width checkbox-row">
            <label class="checkbox-lbl">
              <input
                type="checkbox"
                [checked]="forceRefresh()"
                (change)="forceRefresh.set($any($event.target).checked)"
              />
              <span>Forzar Actualización (Omitir validación de caché para auditoría)</span>
            </label>

            <button
              type="button"
              class="btn-evaluate"
              [disabled]="store.isEvaluating()"
              (click)="onEvaluate()"
            >
              @if (store.isEvaluating()) {
                <span>Evaluando en Gatekeeper...</span>
              } @else {
                <span>Evaluar Solicitud de Admisión</span>
              }
            </button>
          </div>
        </div>

        <!-- Verdict Display -->
        @if (store.lastEvaluation(); as evalResult) {
          <div
            class="verdict-card"
            [class.verdict-hit]="evalResult.verdict === 'CACHE_HIT_BRONZE' || evalResult.verdict === 'CACHE_HIT_GOLD'"
            [class.verdict-permit]="evalResult.verdict === 'PROCEED_DOWNLOAD'"
            [class.verdict-lock]="evalResult.verdict === 'IN_FLIGHT_LOCKED' || evalResult.verdict === 'IN_PROGRESS'"
          >
            <div class="verdict-top">
              <div class="verdict-heading">
                <span class="verdict-tag mono">VEREDICTO EMITIDO</span>
                <span
                  class="verdict-badge"
                  [class.badge-hit]="evalResult.verdict === 'CACHE_HIT_BRONZE' || evalResult.verdict === 'CACHE_HIT_GOLD'"
                  [class.badge-permit]="evalResult.verdict === 'PROCEED_DOWNLOAD'"
                >
                  {{ getVerdictTitle(evalResult.verdict) }}
                </span>
              </div>
              <div class="verdict-latency mono">
                <span>Tiempo de Evaluación:</span>
                <strong>&lt; 15 ms</strong>
              </div>
            </div>

            <p class="verdict-reason">{{ evalResult.reason }}</p>

            <div class="verdict-metrics-grid">
              <div class="metric-item">
                <span class="metric-lbl">Clave de Idempotencia:</span>
                <span class="metric-val mono snippet">{{ evalResult.idempotency_key }}</span>
              </div>

              <div class="metric-item">
                <span class="metric-lbl">Bloqueo Adquirido:</span>
                <span class="metric-val mono">{{ evalResult.lock_acquired ? 'SÍ (RECURSO EN INGESTA)' : 'NO (RECUPERADO DE CUSTODIA)' }}</span>
              </div>

              @if (evalResult.cached_artifact_id) {
                <div class="metric-item">
                  <span class="metric-lbl">ID de Archivo en Custodia:</span>
                  <span class="metric-val mono text-highlight">{{ evalResult.cached_artifact_id }}</span>
                </div>
              }

              @if (evalResult.in_flight_task_id) {
                <div class="metric-item">
                  <span class="metric-lbl">Tarea en Vuelo Asignada:</span>
                  <span class="metric-val mono text-highlight">{{ evalResult.in_flight_task_id }}</span>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .gatekeeper-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .rules-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .rules-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .rules-badge {
      font-size: 10px;
      font-weight: 700;
      color: #60a5fa;
      letter-spacing: 0.05em;
      font-family: var(--font-mono);
    }
    .rules-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }
    .rules-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
      max-width: 900px;
    }
    .rules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
      margin-top: 6px;
    }
    .rule-item {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 14px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .rule-num {
      font-size: 13px;
      font-weight: 700;
      color: #60a5fa;
      background: rgba(37, 99, 235, 0.12);
      border: 1px solid rgba(37, 99, 235, 0.3);
      padding: 2px 6px;
      border-radius: 3px;
    }
    .rule-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .rule-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-main);
    }
    .rule-detail {
      font-size: 11px;
      color: var(--text-subtle);
      line-height: 1.4;
    }

    /* Playground */
    .playground-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .playground-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 14px;
    }
    .playground-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }
    .playground-tag {
      font-size: 10px;
      font-weight: 700;
      color: #34d399;
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      padding: 3px 8px;
      border-radius: 3px;
      font-family: var(--font-mono);
    }
    .presets-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .presets-lbl {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      text-transform: uppercase;
    }
    .btn-preset {
      background: var(--bg-app);
      border: 1px solid var(--border-medium);
      color: var(--text-muted);
      padding: 5px 12px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-preset:hover {
      background: var(--bg-surface-elevated);
      color: var(--text-main);
      border-color: var(--border-focus);
    }
    .eval-form-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group.full-width {
      grid-column: 1 / -1;
    }
    .form-lbl {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      text-transform: uppercase;
    }
    .form-input {
      background: var(--bg-app);
      border: 1px solid var(--border-medium);
      color: var(--text-main);
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
    }
    .form-input:focus {
      outline: none;
      border-color: var(--border-focus);
    }
    .checkbox-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-direction: row;
      gap: 16px;
      margin-top: 4px;
    }
    .checkbox-lbl {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
      cursor: pointer;
    }
    .btn-evaluate {
      background: var(--primary);
      border: 1px solid #1d4ed8;
      color: #ffffff;
      padding: 9px 20px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-evaluate:hover:not(:disabled) {
      background: var(--primary-hover);
    }
    .btn-evaluate:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Verdict Card */
    .verdict-card {
      background: var(--bg-app);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      animation: fadeIn 0.15s ease;
    }
    .verdict-card.verdict-hit {
      border-color: rgba(59, 130, 246, 0.4);
      background: rgba(37, 99, 235, 0.04);
    }
    .verdict-card.verdict-permit {
      border-color: rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.04);
    }
    .verdict-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .verdict-heading {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .verdict-tag {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-subtle);
      letter-spacing: 0.05em;
    }
    .verdict-badge {
      font-size: 12px;
      font-weight: 700;
      font-family: var(--font-mono);
      padding: 4px 10px;
      border-radius: 4px;
      letter-spacing: 0.03em;
    }
    .badge-hit {
      background: rgba(37, 99, 235, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(37, 99, 235, 0.35);
    }
    .badge-permit {
      background: var(--success-bg);
      color: #34d399;
      border: 1px solid var(--success-border);
    }
    .verdict-latency {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      gap: 6px;
    }
    .verdict-reason {
      font-size: 13px;
      color: var(--text-main);
      line-height: 1.5;
    }
    .verdict-metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
      background: var(--bg-surface);
      padding: 14px 16px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }
    .metric-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .metric-lbl {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-subtle);
      text-transform: uppercase;
    }
    .metric-val {
      font-size: 12px;
      color: var(--text-main);
    }
    .text-highlight {
      color: #60a5fa;
      font-weight: 700;
    }
    .snippet {
      word-break: break-all;
    }
    .mono {
      font-family: var(--font-mono);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class InternoGatekeeperComponent {
  readonly store = inject(InternoStore);

  readonly datasetCode = signal<string>('DS_BO_BBV');
  readonly domain = signal<string>('www.bbv.com.bo');
  readonly targetUrl = signal<string>('https://www.bbv.com.bo/estadisticas/boletin_2026_08.pdf');
  readonly period = signal<string>('LATEST');
  readonly forceRefresh = signal<boolean>(false);

  applyPreset(preset: 'bbv-cached' | 'finrural-cached' | 'new-report' | 'force-audit'): void {
    switch (preset) {
      case 'bbv-cached':
        this.datasetCode.set('DS_BO_BBV');
        this.domain.set('www.bbv.com.bo');
        this.targetUrl.set('https://www.bbv.com.bo/wp-content/uploads/2024/10/137-tarifario-oficial-bbv.pdf');
        this.period.set('LATEST');
        this.forceRefresh.set(false);
        break;
      case 'finrural-cached':
        this.datasetCode.set('DS_BO_FINRURAL');
        this.domain.set('www.finrural.org.bo');
        this.targetUrl.set('https://www.finrural.org.bo/descargas/cartera_2026_01.pdf');
        this.period.set('2026-01');
        this.forceRefresh.set(false);
        break;
      case 'new-report':
        this.datasetCode.set('DS_BO_BCB');
        this.domain.set('www.bcb.gob.bo');
        this.targetUrl.set('https://www.bcb.gob.bo/publicaciones/boletin_nuevo_octubre_2026.pdf');
        this.period.set('2026-10');
        this.forceRefresh.set(false);
        break;
      case 'force-audit':
        this.datasetCode.set('DS_BO_BBV');
        this.domain.set('www.bbv.com.bo');
        this.targetUrl.set('https://www.bbv.com.bo/wp-content/uploads/2024/10/137-tarifario-oficial-bbv.pdf');
        this.period.set('LATEST');
        this.forceRefresh.set(true);
        break;
    }
    this.onEvaluate();
  }

  getVerdictTitle(verdict: string): string {
    switch (verdict) {
      case 'CACHE_HIT_BRONZE':
      case 'CACHE_HIT_GOLD':
        return 'DOCUMENTO YA RESGUARDADO (DESCARGA EVITADA)';
      case 'PROCEED_DOWNLOAD':
        return 'AUTORIZACIÓN DE DESCARGA CONCEDIDA';
      case 'IN_FLIGHT_LOCKED':
      case 'IN_PROGRESS':
        return 'BLOQUEO ACTIVO (DESCARGA EN TRÁNSITO)';
      case 'REUSE_DERIVATION':
        return 'REUTILIZACIÓN DIRECTA DE INFORMACIÓN CONSOLIDADA';
      default:
        return verdict;
    }
  }

  onEvaluate(): void {
    const req: IngestionEvaluateRequest = {
      dataset_code: this.datasetCode(),
      domain: this.domain(),
      target_url: this.targetUrl(),
      period: this.period(),
      force_refresh: this.forceRefresh()
    };
    this.store.evaluateAdmission(req);
  }
}
