import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="app-sidebar">
      <div class="sidebar-section">
        <span class="section-heading">MÓDULOS DE AUDITORÍA</span>
        <nav class="nav-menu">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <span class="nav-indicator"></span>
            <div class="nav-content">
              <span class="nav-title">Panel de Control</span>
              <span class="nav-desc">Indicadores y resumen de cobertura</span>
            </div>
          </a>

          <a routerLink="/audit-matrix" routerLinkActive="active" class="nav-item">
            <span class="nav-indicator"></span>
            <div class="nav-content">
              <span class="nav-title">Auditoría de Publicaciones</span>
              <span class="nav-desc">Cronograma y control de brechas</span>
            </div>
          </a>

          <a routerLink="/rescue-console" routerLinkActive="active" class="nav-item">
            <span class="nav-indicator"></span>
            <div class="nav-content">
              <span class="nav-title">Recuperación de Archivos</span>
              <span class="nav-desc">Búsqueda asistida en hemerotecas</span>
            </div>
          </a>

          <a routerLink="/catalog-radar" routerLinkActive="active" class="nav-item">
            <span class="nav-indicator"></span>
            <div class="nav-content">
              <span class="nav-title">Explorador de Publicaciones</span>
              <span class="nav-desc">Inventario web indexado</span>
            </div>
          </a>

          <a routerLink="/bronze-lake" routerLinkActive="active" class="nav-item">
            <span class="nav-indicator"></span>
            <div class="nav-content">
              <span class="nav-title">Gestión de Descargas</span>
              <span class="nav-desc">Repositorio y almacenamiento local</span>
            </div>
          </a>
        </nav>
      </div>

      <div class="sidebar-section">
        <span class="section-heading">SUPERVISIÓN FINANCIERA</span>
        <nav class="nav-menu">
          <a routerLink="/gold-analytics" routerLinkActive="active" class="nav-item">
            <span class="nav-indicator"></span>
            <div class="nav-content">
              <span class="nav-title">Supervisión de Cartera y Solvencia</span>
              <span class="nav-desc">Análisis comparativo de IFDs y mora</span>
            </div>
          </a>
        </nav>
      </div>

      <div class="sidebar-footer">
        <div class="footer-app-name">DATAX Compliance Suite</div>
        <div class="footer-version">Sistema Integral de Auditoría</div>
      </div>
    </aside>
  `,
  styles: [`
    .app-sidebar {
      width: 250px;
      min-width: 250px;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20px 14px;
      height: calc(100vh - 56px);
      overflow-y: auto;
    }
    .sidebar-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .section-heading {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-subtle);
      letter-spacing: 0.06em;
      padding: 0 10px;
    }
    .nav-menu {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      text-decoration: none;
      transition: all 0.15s ease;
      position: relative;
    }
    .nav-item:hover {
      background: var(--bg-surface-elevated);
      color: var(--text-main);
      text-decoration: none;
    }
    .nav-item.active {
      background: rgba(37, 99, 235, 0.12);
      color: #60a5fa;
    }
    .nav-indicator {
      width: 4px;
      height: 24px;
      border-radius: 2px;
      background: transparent;
      transition: background 0.15s ease;
    }
    .nav-item.active .nav-indicator {
      background: var(--primary);
    }
    .nav-content {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .nav-title {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .nav-desc {
      font-size: 11px;
      color: var(--text-subtle);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .sidebar-footer {
      border-top: 1px solid var(--border-subtle);
      padding: 14px 10px 4px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .footer-app-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .footer-version {
      font-size: 10px;
      color: var(--text-subtle);
    }
  `]
})
export class SidebarComponent {}
