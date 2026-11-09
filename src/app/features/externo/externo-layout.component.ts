import { Component, computed, inject, signal } from '@angular/core';
import { ExternoStore } from './externo.store';
import { ExternoOverviewComponent } from './components/externo-overview.component';
import { ExternoDiscoveryComponent } from './components/externo-discovery.component';
import { ExternoInventoryComponent } from './components/externo-inventory.component';
import { ExternoConfigComponent } from './components/externo-config.component';
import { ExternoAlertsComponent } from './components/externo-alerts.component';
import { ExternoRunsComponent } from './components/externo-runs.component';
import { formatIntegerBo } from '../../shared/utils/format.utils';

export type ExternoTab = 'overview' | 'discovery' | 'inventory' | 'config' | 'alerts' | 'runs';

@Component({
  selector: 'app-externo-layout',
  standalone: true,
  imports: [
    ExternoOverviewComponent,
    ExternoDiscoveryComponent,
    ExternoInventoryComponent,
    ExternoConfigComponent,
    ExternoAlertsComponent,
    ExternoRunsComponent
  ],
  templateUrl: './externo-layout.component.html',
  styleUrls: ['./externo-layout.component.css']
})
export class ExternoLayoutComponent {
  readonly store = inject(ExternoStore);
  readonly activeTab = signal<ExternoTab>('overview');
  readonly formatInt = formatIntegerBo;

  readonly isServiceOnline = computed(() => {
    const s = this.store.serviceStatus().toUpperCase();
    return s === 'UP' || s === 'HEALTHY' || s === 'OFFLINE_CACHE';
  });

  readonly serviceLabel = computed(() => {
    if (this.store.serviceStatus() === 'VERIFICANDO') return 'VERIFICANDO';
    return this.isServiceOnline() ? 'SERVICIO EN LÍNEA' : 'SIN CONEXIÓN';
  });

  setTab(tab: ExternoTab): void {
    this.activeTab.set(tab);
  }

  onExploreSource(sourceId: string): void {
    this.store.setSourceFilter(sourceId);
    this.activeTab.set('inventory');
  }

  onConfigureSource(sourceId: string): void {
    this.store.setSourceFilter(sourceId);
    this.activeTab.set('config');
  }

  onInspectAlerts(sourceId: string): void {
    this.store.openMaintenanceReport(sourceId);
    this.activeTab.set('alerts');
  }
}
