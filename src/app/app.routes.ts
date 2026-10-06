import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AuditMatrixComponent } from './features/audit-matrix/audit-matrix.component';
import { RescueConsoleComponent } from './features/rescue-console/rescue-console.component';
import { CatalogRadarComponent } from './features/catalog-radar/catalog-radar.component';
import { BronzeLakeComponent } from './features/bronze-lake/bronze-lake.component';
import { GoldAnalyticsComponent } from './features/gold-analytics/gold-analytics.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'gold-analytics', component: GoldAnalyticsComponent },
      { path: 'audit-matrix', component: AuditMatrixComponent },
      { path: 'rescue-console', component: RescueConsoleComponent },
      { path: 'catalog-radar', component: CatalogRadarComponent },
      { path: 'bronze-lake', component: BronzeLakeComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
