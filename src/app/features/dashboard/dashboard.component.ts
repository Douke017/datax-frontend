import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReportesService } from '../../core/services/reportes.service';
import { AuditMetrics } from '../../core/models/audit.model';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { InstitutionStateService } from '../../core/services/institution-state.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [KpiCardComponent],
  template: `
    <div class="dashboard-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Panel de Control de Cumplimiento Regulatorio</h1>
          <p class="page-desc">
            Supervisión integral de cobertura de publicaciones oficiales y diagnóstico de disponibilidad digital.
          </p>
        </div>
        <button class="btn-primary" (click)="loadMetrics()" [disabled]="loading()">
          @if (loading()) {
            <span>Consultando...</span>
          } @else {
            <span>Actualizar Indicadores</span>
          }
        </button>
      </div>

      <!-- Macro Indicators -->
      <div class="kpi-grid">
        <app-kpi-card
          title="Obligaciones Normativas"
          [value]="totalExpected()"
          subtitle="Publicaciones exigidas por ley en las 4 entidades (2018–2026)"
          tone="default"
          badgeText="MARCO LEGAL"
        />
        <app-kpi-card
          title="En Custodia Local"
          [value]="totalConfirmed()"
          [subtitle]="'Con firma SHA-256 en disco local · Cobertura ICR: ' + globalIcr() + '%'"
          tone="success"
          badgeText="RESGUARDADO"
        />
        <app-kpi-card
          title="En Riesgo en Portales Web"
          [value]="totalPending()"
          [subtitle]="'Disponibles en web oficial sin copia local · TSW: ' + globalTsw() + '%'"
          tone="warning"
          badgeText="PENDIENTE COPIA"
        />
        <app-kpi-card
          title="Documentos Desaparecidos"
          [value]="totalCriticalGaps()"
          [subtitle]="'Ausentes en web oficial; requieren rescate · TRD: ' + globalTrd() + '%'"
          tone="danger"
          badgeText="ACCIÓN REQUERIDA"
        />
      </div>

      <!-- Comparative Table by Regulatory Entity -->
      <div class="section-card">
        <div class="card-header">
          <h2 class="card-title">Resumen por Entidad Supervisada</h2>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Entidad Regulada</th>
                <th>Requeridas</th>
                <th>En Almacén</th>
                <th>Pendientes</th>
                <th>No Disponibles</th>
                <th>Cobertura (ICR)</th>
                <th>Retención (TRD)</th>
                <th>Supervivencia (TSW)</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (row of metrics(); track row.source_id) {
                <tr>
                  <td>
                    <span class="entity-name">{{ formatEntityName(row.source_id) }}</span>
                  </td>
                  <td><span class="num-cell">{{ row.total_expected }}</span></td>
                  <td><span class="num-cell text-success">{{ row.confirmed_online }}</span></td>
                  <td><span class="num-cell text-warning">{{ row.pending_ingestion }}</span></td>
                  <td><span class="num-cell text-danger">{{ row.critical_gaps }}</span></td>
                  <td>
                    <div class="progress-bar-container">
                      <div class="progress-bar" [style.width.%]="row.icr"></div>
                      <span class="progress-text">{{ row.icr }}%</span>
                    </div>
                  </td>
                  <td><span class="num-cell">{{ row.trd }}%</span></td>
                  <td><span class="num-cell">{{ row.tsw }}%</span></td>
                  <td style="text-align: right;">
                    <button
                      class="btn-secondary btn-sm"
                      (click)="goToEntity(row.source_id)"
                    >
                      Ver Auditoría
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="empty-state">
                    @if (loading()) {
                      <span>Cargando indicadores de auditoría...</span>
                    } @else {
                      <span>No se registraron datos de cumplimiento.</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Operational Insights -->
      <div class="insights-grid">
        <div class="insight-box danger">
          <div class="insight-title">ASFI y Banco Central de Bolivia: Publicaciones Históricas No Localizadas</div>
          <p class="insight-desc">
            Se detectaron 104 publicaciones mensuales requeridas por ley que ya no están disponibles en las rutas oficiales activas (2018–2026).
            Se recomienda activar el módulo de recuperación asistida para rastreo en hemerotecas y repositorios abiertos.
          </p>
          <div class="insight-action">
            <button class="btn-primary btn-sm" (click)="goToRescue('asfi')">
              Iniciar Búsqueda ASFI
            </button>
          </div>
        </div>

        <div class="insight-box warning">
          <div class="insight-title">FINRURAL: Documentos Pendientes de Descarga Local</div>
          <p class="insight-desc">
            Se identificaron 100 boletines disponibles en el portal oficial que aún no han sido resguardados en el almacén local.
            Puede programar la descarga para garantizar su custodia y prevenir pérdidas ante futuras modificaciones del portal.
          </p>
          <div class="insight-action">
            <button class="btn-secondary btn-sm" (click)="goToEntity('finrural')">
              Revisar Descargas
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .page-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.01em;
    }
    .page-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .section-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .card-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
    }
    .entity-name {
      font-weight: 600;
      color: #93c5fd;
    }
    .num-cell {
      font-family: var(--font-mono);
      font-weight: 600;
    }
    .text-success { color: #34d399; }
    .text-warning { color: #fbbf24; }
    .text-danger { color: #f87171; }
    .progress-bar-container {
      width: 120px;
      height: 18px;
      background: var(--bg-surface-elevated);
      border-radius: 3px;
      position: relative;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
    }
    .progress-bar {
      height: 100%;
      background: #2563eb;
      transition: width 0.3s ease;
    }
    .progress-text {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    }
    .empty-state {
      text-align: center;
      padding: 32px !important;
      color: var(--text-subtle);
      font-style: italic;
    }
    .insights-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 800px) {
      .insights-grid {
        grid-template-columns: 1fr;
      }
    }
    .insight-box {
      background: var(--bg-surface);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .insight-box.danger {
      border: 1px solid var(--danger-border);
      background: linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, var(--bg-surface) 100%);
    }
    .insight-box.warning {
      border: 1px solid var(--warning-border);
      background: linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, var(--bg-surface) 100%);
    }
    .insight-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
    }
    .insight-desc {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .insight-action {
      margin-top: 4px;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly reportesService = inject(ReportesService);
  private readonly instState = inject(InstitutionStateService);
  private readonly router = inject(Router);

  readonly metrics = signal<AuditMetrics[]>([]);
  readonly loading = signal<boolean>(false);

  readonly totalExpected = signal<number>(0);
  readonly totalConfirmed = signal<number>(0);
  readonly totalPending = signal<number>(0);
  readonly globalIcr = signal<number>(0);
  readonly globalTsw = signal<number>(0);
  readonly globalTrd = signal<number>(0);
  readonly totalCriticalGaps = signal<number>(0);

  ngOnInit(): void {
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.loading.set(true);
    this.reportesService.getKpiMetrics().subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.computeGlobals(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  private computeGlobals(data: AuditMetrics[]): void {
    if (!data.length) return;
    let expected = 0;
    let confirmed = 0;
    let pending = 0;
    let critical = 0;

    for (const m of data) {
      expected += m.total_expected;
      confirmed += m.confirmed_online;
      pending += m.pending_ingestion;
      critical += m.critical_gaps;
    }

    const icr = expected > 0 ? (confirmed / expected) * 100 : 0;
    const tsw = expected > 0 ? ((confirmed + pending) / expected) * 100 : 0;
    const trd = (confirmed + pending) > 0 ? (confirmed / (confirmed + pending)) * 100 : 0;

    this.totalExpected.set(expected);
    this.totalConfirmed.set(confirmed);
    this.totalPending.set(pending);
    this.globalIcr.set(parseFloat(icr.toFixed(1)));
    this.globalTsw.set(parseFloat(tsw.toFixed(1)));
    this.globalTrd.set(parseFloat(trd.toFixed(1)));
    this.totalCriticalGaps.set(critical);
  }

  formatEntityName(sourceId: string): string {
    switch (sourceId.toLowerCase()) {
      case 'asfi':
        return 'ASFI — Supervisión Financiera';
      case 'bcb':
        return 'Banco Central de Bolivia';
      case 'finrural':
        return 'FINRURAL — Microfinanzas';
      case 'bbv':
        return 'Bolsa Boliviana de Valores';
      default:
        return sourceId.toUpperCase();
    }
  }

  goToEntity(sourceId: string): void {
    this.instState.setInstitution(sourceId);
    this.router.navigate(['/audit-matrix']);
  }

  goToRescue(sourceId: string): void {
    this.instState.setInstitution(sourceId);
    this.router.navigate(['/rescue-console']);
  }
}
