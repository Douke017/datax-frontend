import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SystemMonitorService } from '../../core/services/system-monitor.service';
import { InstitutionStateService, INSTITUTIONS } from '../../core/services/institution-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="app-header">
      <!-- Left: Brand Identity -->
      <div class="brand">
        <div class="brand-badge">DATAX</div>
        <div class="brand-info">
          <span class="brand-title">Compliance & Financial Intelligence</span>
          <span class="brand-subtitle">Plataforma de Auditoría Institucional y Custodia Digital</span>
        </div>
      </div>

      <!-- Center: Workspace Switcher (Los 3 Sistemas) -->
      <nav class="system-switcher" aria-label="Selector de Sistemas">
        <a
          routerLink="/externo"
          routerLinkActive="active"
          class="switcher-tab"
        >
          <span class="tab-step mono">1</span>
          <span class="tab-title">Exploración Web</span>
        </a>

        <a
          routerLink="/interno"
          routerLinkActive="active"
          class="switcher-tab"
        >
          <span class="tab-step mono">2</span>
          <span class="tab-title">Custodia e Ingesta</span>
        </a>

        <a
          routerLink="/audit-matrix"
          routerLinkActive="active"
          class="switcher-tab"
        >
          <span class="tab-step mono">3</span>
          <span class="tab-title">Conciliación y Auditoría</span>
        </a>
      </nav>

      <!-- Right: Entity Selector & System Health -->
      <div class="header-right">
        <div class="entity-selector-box">
          <label class="entity-selector-label" for="header-entity-select">Entidad:</label>
          <select
            id="header-entity-select"
            class="entity-select"
            [value]="instState.currentInstitutionId()"
            (change)="onEntityChange($event)"
          >
            @for (inst of institutions; track inst.id) {
              <option [value]="inst.id">{{ inst.code }} — {{ inst.name }}</option>
            }
          </select>
        </div>

        <div class="system-status" [class.online]="monitor.isAllOperational()" [class.warning]="!monitor.isAllOperational()">
          <span class="status-dot"></span>
          <span class="status-label">
            @if (monitor.isAllOperational()) {
              Operativo
            } @else {
              Conexión Parcial
            }
          </span>
        </div>

        <button
          type="button"
          class="btn-refresh"
          (click)="monitor.refreshAll()"
          title="Actualizar estado de conexión"
        >
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
      padding: 0 20px;
      gap: 16px;
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
      font-size: 13px;
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
      font-size: 10px;
      color: var(--text-subtle);
      white-space: nowrap;
    }

    /* Workspace Switcher */
    .system-switcher {
      display: flex;
      align-items: center;
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 3px;
      gap: 4px;
    }
    .switcher-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 3px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.15s ease;
    }
    .switcher-tab:hover {
      color: var(--text-main);
      background: var(--bg-surface-elevated);
      text-decoration: none;
    }
    .switcher-tab.active {
      background: var(--bg-surface-elevated);
      color: #60a5fa;
      border: 1px solid var(--border-medium);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    .tab-step {
      font-size: 10px;
      font-weight: 700;
      background: var(--bg-surface);
      color: var(--text-subtle);
      padding: 1px 5px;
      border-radius: 3px;
      border: 1px solid var(--border-subtle);
    }
    .switcher-tab.active .tab-step {
      background: rgba(37, 99, 235, 0.2);
      color: #60a5fa;
      border-color: rgba(37, 99, 235, 0.4);
    }
    .tab-title {
      white-space: nowrap;
    }

    /* Right Controls */
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .entity-selector-box {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .entity-selector-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      text-transform: uppercase;
    }
    .entity-select {
      background: var(--bg-app);
      border: 1px solid var(--border-medium);
      color: var(--text-main);
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      border-radius: var(--radius-sm);
      max-width: 220px;
      cursor: pointer;
    }
    .entity-select:focus {
      outline: none;
      border-color: var(--border-focus);
    }
    .system-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      font-size: 11px;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--danger);
    }
    .system-status.online .status-dot {
      background: var(--success);
      box-shadow: 0 0 5px rgba(16, 185, 129, 0.5);
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
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      cursor: pointer;
    }
    .btn-refresh:hover {
      background: var(--bg-surface-hover);
      color: var(--text-main);
    }
    .mono {
      font-family: var(--font-mono);
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
