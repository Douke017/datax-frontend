import { Component, inject, signal } from '@angular/core';
import { ExternoStore } from './externo.store';
import { ExternoOverviewComponent } from './components/externo-overview.component';
import { ExternoInventoryComponent } from './components/externo-inventory.component';
import { ExternoRunsComponent } from './components/externo-runs.component';

type ExternoTab = 'overview' | 'inventory' | 'runs';

@Component({
  selector: 'app-externo-layout',
  standalone: true,
  imports: [
    ExternoOverviewComponent,
    ExternoInventoryComponent,
    ExternoRunsComponent
  ],
  template: `
    <div class="externo-layout">
      <!-- Top Module Bar -->
      <div class="module-header">
        <div class="module-title-box">
          <div class="system-badge-row">
            <span class="system-tag">SISTEMA 1</span>
            <span class="system-name">PROSPECTOR EXTERNO</span>
            <span class="status-live" [class.status-live-ok]="store.serviceStatus() === 'UP' || store.serviceStatus() === 'healthy'">
              {{ store.serviceStatus() }}
            </span>
          </div>
          <h1 class="module-title">Exploración y Descubrimiento Web</h1>
          <p class="module-desc">
            Vigilancia sistemática, indexación y detección de cambios en los portales oficiales de instituciones financieras y regulatorias.
          </p>
        </div>

        <div class="module-actions">
          <button
            type="button"
            class="btn-sync"
            [disabled]="store.loading()"
            (click)="store.loadAll()"
          >
            @if (store.loading()) {
              <span>Sincronizando...</span>
            } @else {
              <span>Actualizar Rastreo</span>
            }
          </button>
        </div>
      </div>

      <!-- Module Navigation Sub-Tabs -->
      <nav class="sub-nav-tabs">
        <button
          type="button"
          class="sub-nav-tab"
          [class.active]="activeTab() === 'overview'"
          (click)="setTab('overview')"
        >
          <span class="tab-label">Resumen y Portales</span>
          <span class="tab-badge">{{ store.sources().length }}</span>
        </button>

        <button
          type="button"
          class="sub-nav-tab"
          [class.active]="activeTab() === 'inventory'"
          (click)="setTab('inventory')"
        >
          <span class="tab-label">Inventario Web Indexado</span>
          <span class="tab-badge">{{ store.totalDiscovered() }}</span>
        </button>

        <button
          type="button"
          class="sub-nav-tab"
          [class.active]="activeTab() === 'runs'"
          (click)="setTab('runs')"
        >
          <span class="tab-label">Historial de Barridos</span>
          <span class="tab-badge">{{ store.runs().length }}</span>
        </button>
      </nav>

      <!-- Main Content Area -->
      <div class="tab-content-area">
        @switch (activeTab()) {
          @case ('overview') {
            <app-externo-overview />
          }
          @case ('inventory') {
            <app-externo-inventory />
          }
          @case ('runs') {
            <app-externo-runs />
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .externo-layout {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .module-header {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 24px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
    }
    .module-title-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .system-badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .system-tag {
      font-size: 10px;
      font-weight: 700;
      color: #60a5fa;
      background: rgba(37, 99, 235, 0.15);
      border: 1px solid rgba(37, 99, 235, 0.3);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--font-mono);
      letter-spacing: 0.05em;
    }
    .system-name {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.05em;
      font-family: var(--font-mono);
    }
    .status-live {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-subtle);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--font-mono);
    }
    .status-live.status-live-ok {
      color: #34d399;
      background: var(--success-bg);
      border-color: var(--success-border);
    }
    .module-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }
    .module-desc {
      font-size: 13px;
      color: var(--text-muted);
      max-width: 800px;
      line-height: 1.5;
    }
    .module-actions {
      display: flex;
      align-items: center;
    }
    .btn-sync {
      background: var(--primary);
      border: 1px solid #1d4ed8;
      color: #ffffff;
      padding: 8px 18px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-sync:hover:not(:disabled) {
      background: var(--primary-hover);
    }
    .btn-sync:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .sub-nav-tabs {
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 2px;
    }
    .sub-nav-tab {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--text-muted);
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
    }
    .sub-nav-tab:hover {
      color: var(--text-main);
    }
    .sub-nav-tab.active {
      color: #60a5fa;
      border-bottom-color: var(--primary);
    }
    .tab-badge {
      font-size: 11px;
      font-family: var(--font-mono);
      background: var(--bg-surface-elevated);
      color: var(--text-subtle);
      padding: 1px 6px;
      border-radius: 10px;
      border: 1px solid var(--border-subtle);
    }
    .sub-nav-tab.active .tab-badge {
      background: rgba(37, 99, 235, 0.2);
      color: #60a5fa;
      border-color: rgba(37, 99, 235, 0.4);
    }
    .tab-content-area {
      min-height: 400px;
    }
  `]
})
export class ExternoLayoutComponent {
  readonly store = inject(ExternoStore);
  readonly activeTab = signal<ExternoTab>('inventory');

  setTab(tab: ExternoTab): void {
    this.activeTab.set(tab);
  }
}
