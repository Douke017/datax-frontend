import { Component, inject, signal } from '@angular/core';
import { InternoStore } from './interno.store';
import { InternoCuraduriaComponent } from './components/interno-curaduria.component';
import { InternoGatekeeperComponent } from './components/interno-gatekeeper.component';
import { InternoCustodiaComponent } from './components/interno-custodia.component';
import { InternoLineageComponent } from './components/interno-lineage.component';
import { InternoActivosComponent } from './components/interno-activos.component';

type InternoTab = 'curaduria' | 'gatekeeper' | 'custodia' | 'activos' | 'lineage';

@Component({
  selector: 'app-interno-layout',
  standalone: true,
  imports: [
    InternoCuraduriaComponent,
    InternoGatekeeperComponent,
    InternoCustodiaComponent,
    InternoLineageComponent,
    InternoActivosComponent
  ],
  template: `
    <div class="interno-layout">
      <!-- Top Module Bar -->
      <div class="module-header">
        <div class="module-title-box">
          <div class="system-badge-row">
            <span class="system-name">PROSPECTOR INTERNO</span>
            <span class="status-live">OPERATIVO</span>
          </div>
          <h1 class="module-title">Custodia Documental, Gatekeeper e Ingesta de Datos</h1>
          <p class="module-desc">
            Prevención de descargas redundantes mediante Pre-Flight Gatekeeper, repositorio físico Bronze con firmas criptográficas SHA-256 e inventario técnico.
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
              <span>Verificando...</span>
            } @else {
              <span>Actualizar Repositorio</span>
            }
          </button>
        </div>
      </div>

      <!-- Module Navigation Sub-Tabs -->
      <nav class="sub-nav-tabs">
        <button
          type="button"
          class="sub-nav-tab"
          [class.active]="activeTab() === 'curaduria'"
          (click)="setTab('curaduria')"
        >
          <span class="tab-label">Curaduría de URLs e Ingesta</span>
          <span class="tab-badge">3,574 URLs</span>
        </button>

        <button
          type="button"
          class="sub-nav-tab"
          [class.active]="activeTab() === 'gatekeeper'"
          (click)="setTab('gatekeeper')"
        >
          <span class="tab-label">Control de Admisión (Gatekeeper)</span>
          <span class="tab-badge mono">&lt;20ms</span>
        </button>

        <button
          type="button"
          class="sub-nav-tab"
          [class.active]="activeTab() === 'custodia'"
          (click)="setTab('custodia')"
        >
          <span class="tab-label">Custodia de Archivos (Repositorio Original)</span>
          <span class="tab-badge">{{ store.totalArtifactsCount() }}</span>
        </button>

        <button
          type="button"
          class="sub-nav-tab"
          [class.active]="activeTab() === 'activos'"
          (click)="setTab('activos')"
        >
          <span class="tab-label">Activos Técnicos y Autoservicio (Gold)</span>
          <span class="tab-badge">DUCKDB OLAP</span>
        </button>

        <button
          type="button"
          class="sub-nav-tab"
          [class.active]="activeTab() === 'lineage'"
          (click)="setTab('lineage')"
        >
          <span class="tab-label">Cadena de Custodia y Linaje</span>
          <span class="tab-badge">SHA-256</span>
        </button>
      </nav>

      <!-- Main Content Area -->
      <div class="tab-content-area">
        @switch (activeTab()) {
          @case ('curaduria') {
            <app-interno-curaduria />
          }
          @case ('gatekeeper') {
            <app-interno-gatekeeper />
          }
          @case ('custodia') {
            <app-interno-custodia />
          }
          @case ('activos') {
            <app-interno-activos />
          }
          @case ('lineage') {
            <app-interno-lineage />
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .interno-layout {
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
      color: #34d399;
      background: var(--success-bg);
      border: 1px solid var(--success-border);
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
      color: #34d399;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--success-border);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--font-mono);
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
      max-width: 820px;
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
      overflow-x: auto;
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
      white-space: nowrap;
    }
    .sub-nav-tab:hover {
      color: var(--text-main);
    }
    .sub-nav-tab.active {
      color: #60a5fa;
      border-bottom-color: var(--primary);
    }
    .tab-badge {
      font-size: 10px;
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
    .mono {
      font-family: var(--font-mono);
    }
  `]
})
export class InternoLayoutComponent {
  readonly store = inject(InternoStore);
  readonly activeTab = signal<InternoTab>('curaduria');

  setTab(tab: InternoTab): void {
    this.activeTab.set(tab);
  }
}
