import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { InternoStore } from './interno.store';
import { InventoryStore } from './inventory.store';
import { SystemMonitorService } from '../../core/services/system-monitor.service';
import { InternoCuraduriaComponent } from './components/interno-curaduria.component';
import { InternoGatekeeperComponent } from './components/interno-gatekeeper.component';
import { InternoCustodiaComponent } from './components/interno-custodia.component';
import { InternoActivosComponent } from './components/interno-activos.component';
import { formatInteger } from '../../shared/utils/format.utils';

export type InternoTab = 'gatekeeper' | 'curaduria' | 'custodia' | 'activos';
const VALID_TABS: InternoTab[] = ['gatekeeper', 'curaduria', 'custodia', 'activos'];

@Component({
  selector: 'app-interno-layout',
  standalone: true,
  imports: [
    InternoCuraduriaComponent,
    InternoGatekeeperComponent,
    InternoCustodiaComponent,
    InternoActivosComponent
  ],
  templateUrl: './interno-layout.component.html',
  styleUrl: './interno-layout.component.css'
})
export class InternoLayoutComponent implements OnInit, OnDestroy {
  readonly store = inject(InternoStore);
  readonly inventoryStore = inject(InventoryStore);
  private readonly monitor = inject(SystemMonitorService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly formatInt = formatInteger;
  readonly activeTab = signal<InternoTab>('gatekeeper');
  private qpSub?: Subscription;

  readonly isServiceOnline = computed(() => this.monitor.internoHealth().status === 'UP');

  ngOnInit(): void {
    this.qpSub = this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab') as InternoTab | null;
      if (tab && VALID_TABS.includes(tab)) {
        this.activeTab.set(tab);
      }
    });
  }

  ngOnDestroy(): void {
    this.qpSub?.unsubscribe();
  }

  setTab(tab: InternoTab): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  refreshWorkspace(): void {
    this.store.loadAll();
    this.inventoryStore.loadStats();
    this.inventoryStore.loadUrls();
  }
}
