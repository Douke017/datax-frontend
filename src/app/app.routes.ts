import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { ExternoLayoutComponent } from './features/externo/externo-layout.component';
import { InternoLayoutComponent } from './features/interno/interno-layout.component';
import { BridgeViewComponent } from './features/bridge/bridge-view.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'externo', pathMatch: 'full' },
      // Prospector Externo (Rastreo e inventario web indexado)
      { path: 'externo', component: ExternoLayoutComponent },
      { path: 'catalog-radar', redirectTo: 'externo', pathMatch: 'full' },

      // Prospector Interno (Custodia, Gatekeeper, Curaduría de URLs, Activos Gold)
      { path: 'interno', component: InternoLayoutComponent },
      { path: 'bronze-lake', redirectTo: 'interno', pathMatch: 'full' },
      { path: 'curaduria', redirectTo: 'interno', pathMatch: 'full' },
      { path: 'gold-analytics', redirectTo: 'interno', pathMatch: 'full' },

      // Conciliación y Sync Bridge (Diff DuckDB y Sincronización)
      { path: 'bridge', component: BridgeViewComponent },
      { path: 'conciliacion', redirectTo: 'bridge', pathMatch: 'full' },
      { path: 'audit-matrix', redirectTo: 'bridge', pathMatch: 'full' },
      { path: 'dashboard', redirectTo: 'externo', pathMatch: 'full' },
      { path: 'rescue-console', redirectTo: 'bridge', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'externo' }
];
