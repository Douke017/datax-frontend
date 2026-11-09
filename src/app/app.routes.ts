import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'externo', pathMatch: 'full' },
      {
        path: 'externo',
        loadComponent: () =>
          import('./features/externo/externo-layout.component').then(
            (m) => m.ExternoLayoutComponent
          )
      },
      { path: 'catalog-radar', redirectTo: 'externo', pathMatch: 'full' },

      {
        path: 'interno',
        loadComponent: () =>
          import('./features/interno/interno-layout.component').then(
            (m) => m.InternoLayoutComponent
          )
      },
      { path: 'bronze-lake', redirectTo: 'interno', pathMatch: 'full' },
      { path: 'curaduria', redirectTo: 'interno', pathMatch: 'full' },
      { path: 'gold-analytics', redirectTo: 'interno', pathMatch: 'full' },

      {
        path: 'bridge',
        loadComponent: () =>
          import('./features/bridge/bridge-view.component').then((m) => m.BridgeViewComponent)
      },
      { path: 'conciliacion', redirectTo: 'bridge', pathMatch: 'full' },
      { path: 'audit-matrix', redirectTo: 'bridge', pathMatch: 'full' },
      { path: 'dashboard', redirectTo: 'externo', pathMatch: 'full' },
      { path: 'rescue-console', redirectTo: 'bridge', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'externo' }
];
