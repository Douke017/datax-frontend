import { Component, inject, signal } from '@angular/core';
import { InternoStore } from './interno.store';
import { InventoryStore } from './inventory.store';
import { InternoCuraduriaComponent } from './components/interno-curaduria.component';
import { InternoGatekeeperComponent } from './components/interno-gatekeeper.component';
import { InternoCustodiaComponent } from './components/interno-custodia.component';
import { InternoActivosComponent } from './components/interno-activos.component';
import { formatInteger } from '../../shared/utils/format.utils';

type InternoTab = 'gatekeeper' | 'curaduria' | 'custodia' | 'activos';

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
export class InternoLayoutComponent {
  readonly store = inject(InternoStore);
  readonly inventoryStore = inject(InventoryStore);
  readonly formatInt = formatInteger;
  readonly activeTab = signal<InternoTab>('activos');

  setTab(tab: InternoTab): void {
    this.activeTab.set(tab);
  }

  refreshWorkspace(): void {
    this.store.loadAll();
    this.inventoryStore.loadStats();
    this.inventoryStore.loadUrls();
  }
}
