import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ExternoStore } from './externo.store';
import { ExternoOverviewComponent } from './components/externo-overview.component';
import { ExternoDiscoveryComponent } from './components/externo-discovery.component';
import { ExternoInventoryComponent } from './components/externo-inventory.component';
import { ExternoConfigComponent } from './components/externo-config.component';
import { ExternoAlertsComponent } from './components/externo-alerts.component';
import { ExternoRunsComponent } from './components/externo-runs.component';
import { formatIntegerBo } from '../../shared/utils/format.utils';

export type ExternoTab = 'overview' | 'discovery' | 'inventory' | 'config' | 'alerts' | 'runs';

const VALID_TABS: ExternoTab[] = ['overview', 'discovery', 'inventory', 'config', 'alerts', 'runs'];

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
export class ExternoLayoutComponent implements OnInit, OnDestroy {
  readonly store = inject(ExternoStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly activeTab = signal<ExternoTab>('overview');
  readonly formatInt = formatIntegerBo;

  private qpSub?: Subscription;

  ngOnInit(): void {
    if (this.store.sources().length === 0) {
      this.store.loadAll();
      this.store.loadStorageStatus();
    }

    this.qpSub = this.route.queryParamMap.subscribe((params) => {
      const rawTab = params.get('tab') as ExternoTab | null;
      if (rawTab && VALID_TABS.includes(rawTab)) {
        this.activeTab.set(rawTab);
      }

      const sourceId = params.get('source_id');
      if (sourceId && sourceId !== this.store.selectedSourceId()) {
        this.store.setSourceFilter(sourceId);
      }
    });
  }

  ngOnDestroy(): void {
    this.qpSub?.unsubscribe();
  }

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
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  onExploreSource(sourceId: string): void {
    this.store.setSourceFilter(sourceId);
    this.activeTab.set('inventory');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'inventory', source_id: sourceId, page: 1 },
      queryParamsHandling: 'merge'
    });
  }

  onConfigureSource(sourceId: string): void {
    this.store.setSourceFilter(sourceId);
    this.activeTab.set('config');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'config', source_id: sourceId },
      queryParamsHandling: 'merge'
    });
  }

  onInspectAlerts(sourceId: string): void {
    this.store.openMaintenanceReport(sourceId);
    this.activeTab.set('alerts');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'alerts', source_id: sourceId },
      queryParamsHandling: 'merge'
    });
  }
}
