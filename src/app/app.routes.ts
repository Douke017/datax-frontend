import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { ExternoLayoutComponent } from './features/externo/externo-layout.component';
import { InternoLayoutComponent } from './features/interno/interno-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AuditMatrixComponent } from './features/audit-matrix/audit-matrix.component';
import { RescueConsoleComponent } from './features/rescue-console/rescue-console.component';
import { GoldAnalyticsComponent } from './features/gold-analytics/gold-analytics.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'externo', pathMatch: 'full' },
      // SISTEMA 1: PROSPECTOR EXTERNO
      { path: 'externo', component: ExternoLayoutComponent },
      { path: 'catalog-radar', redirectTo: 'externo', pathMatch: 'full' },

      // SISTEMA 2: PROSPECTOR INTERNO
      { path: 'interno', component: InternoLayoutComponent },
      { path: 'bronze-lake', redirectTo: 'interno', pathMatch: 'full' },
      { path: 'gold-analytics', component: GoldAnalyticsComponent },

      // SISTEMA 3: CONCILIACIÓN Y AUDITORÍA
      { path: 'conciliacion', redirectTo: 'audit-matrix', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'audit-matrix', component: AuditMatrixComponent },
      { path: 'rescue-console', component: RescueConsoleComponent }
    ]
  },
  { path: '**', redirectTo: 'externo' }
];
