import { Component, inject, signal } from '@angular/core';
import { ExternoStore } from './externo.store';
import { ExternoOverviewComponent } from './components/externo-overview.component';
import { ExternoInventoryComponent } from './components/externo-inventory.component';
import { ExternoConfigComponent } from './components/externo-config.component';
import { ExternoRunsComponent } from './components/externo-runs.component';

type ExternoTab = 'overview' | 'inventory' | 'config' | 'runs';

@Component({
  selector: 'app-externo-layout',
  standalone: true,
  imports: [
    ExternoOverviewComponent,
    ExternoInventoryComponent,
    ExternoConfigComponent,
    ExternoRunsComponent
  ],
  templateUrl: './externo-layout.component.html',
  styleUrl: './externo-layout.component.css'
})
export class ExternoLayoutComponent {
  readonly store = inject(ExternoStore);
  readonly activeTab = signal<ExternoTab>('overview');

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
}
