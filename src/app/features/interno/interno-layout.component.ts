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
  templateUrl: './interno-layout.component.html',
  styleUrl: './interno-layout.component.css'
})
export class InternoLayoutComponent {
  readonly store = inject(InternoStore);
  readonly activeTab = signal<InternoTab>('curaduria');

  setTab(tab: InternoTab): void {
    this.activeTab.set(tab);
  }
}
