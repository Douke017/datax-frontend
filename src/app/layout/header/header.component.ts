import { Component, inject } from '@angular/core';
import { SystemMonitorService } from '../../core/services/system-monitor.service';
import { InstitutionStateService, INSTITUTIONS } from '../../core/services/institution-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="app-header">
      <div class="brand">
        <div class="brand-badge">DATAX</div>
        <div class="brand-info">
          <span class="brand-title">Auditoría y Cumplimiento Regulatorio</span>
          <span class="brand-subtitle">Control de publicaciones obligatorias y preservación digital</span>
        </div>
      </div>

      <div class="header-center">
        <label class="entity-selector-label" for="entity-select">Entidad:</label>
        <div class="select-wrapper">
          <select
            id="entity-select"
            class="entity-select"
            [value]="instState.currentInstitutionId()"
            (change)="onEntityChange($event)"
          >
            @for (inst of institutions; track inst.id) {
              <option [value]="inst.id">{{ inst.code }} — {{ inst.name }}</option>
            }
          </select>
        </div>
      </div>

      <div class="header-right">
        <div class="system-status" [class.online]="monitor.isAllOperational()" [class.warning]="!monitor.isAllOperational()">
          <span class="status-dot"></span>
          <span class="status-label">
            @if (monitor.isAllOperational()) {
              Servicios en Línea
            } @else {
              Conexión Parcial
            }
          </span>
        </div>

        <button class="btn-refresh" (click)="monitor.refreshAll()" title="Actualizar estado de conexión">
          Actualizar
        </button>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      height: 56px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      gap: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-badge {
      background: linear-gradient(135deg, #1e40af, #2563eb);
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .brand-info {
      display: flex;
      flex-direction: column;
    }
    .brand-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.01em;
      color: var(--text-main);
    }
    .brand-subtitle {
      font-size: 11px;
      color: var(--text-subtle);
    }
    .header-center {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .entity-selector-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .select-wrapper {
      position: relative;
    }
    .entity-select {
      background: var(--bg-app);
      border: 1px solid var(--border-medium);
      color: var(--text-main);
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      border-radius: var(--radius-sm);
      min-width: 320px;
      cursor: pointer;
    }
    .entity-select:focus {
      outline: none;
      border-color: var(--border-focus);
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .system-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      font-size: 12px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--danger);
    }
    .system-status.online .status-dot {
      background: var(--success);
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    }
    .system-status.warning .status-dot {
      background: var(--warning);
    }
    .status-label {
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 500;
    }
    .btn-refresh {
      background: transparent;
      border: 1px solid var(--border-medium);
      color: var(--text-muted);
      padding: 5px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      cursor: pointer;
    }
    .btn-refresh:hover {
      background: var(--bg-surface-hover);
      color: var(--text-main);
    }
  `]
})
export class HeaderComponent {
  readonly monitor = inject(SystemMonitorService);
  readonly instState = inject(InstitutionStateService);
  readonly institutions = INSTITUTIONS;

  onEntityChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.instState.setInstitution(val);
  }
}
