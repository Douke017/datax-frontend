import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="app-sidebar">
      <div class="sidebar-scroll">
        <!-- SYSTEM 1: PROSPECTOR EXTERNO -->
        <div class="sidebar-section">
          <div class="section-badge-header">
            <span class="system-number mono">1</span>
            <span class="section-heading">PROSPECTOR EXTERNO</span>
          </div>
          <nav class="nav-menu">
            <a routerLink="/externo" routerLinkActive="active" class="nav-item">
              <span class="nav-indicator"></span>
              <div class="nav-content">
                <span class="nav-title">Explorador de Publicaciones</span>
                <span class="nav-desc">Rastreo e inventario web indexado</span>
              </div>
            </a>
          </nav>
        </div>

        <!-- SYSTEM 2: PROSPECTOR INTERNO -->
        <div class="sidebar-section">
          <div class="section-badge-header">
            <span class="system-number mono">2</span>
            <span class="section-heading">PROSPECTOR INTERNO</span>
          </div>
          <nav class="nav-menu">
            <a routerLink="/interno" routerLinkActive="active" class="nav-item">
              <span class="nav-indicator"></span>
              <div class="nav-content">
                <span class="nav-title">Custodia y Admisión</span>
                <span class="nav-desc">Repositorio original, Gatekeeper y SHA-256</span>
              </div>
            </a>

            <a routerLink="/gold-analytics" routerLinkActive="active" class="nav-item">
              <span class="nav-indicator"></span>
              <div class="nav-content">
                <span class="nav-title">Supervisión de Cartera</span>
                <span class="nav-desc">Estados financieros consolidados</span>
              </div>
            </a>
          </nav>
        </div>

        <!-- SYSTEM 3: CONCILIACIÓN Y AUDITORÍA -->
        <div class="sidebar-section">
          <div class="section-badge-header">
            <span class="system-number mono">3</span>
            <span class="section-heading">CONCILIACIÓN Y AUDITORÍA</span>
          </div>
          <nav class="nav-menu">
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
              <span class="nav-indicator"></span>
              <div class="nav-content">
                <span class="nav-title">Panel General</span>
                <span class="nav-desc">Indicadores y resumen ejecutivo</span>
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
                <span class="nav-desc">Consola de rescate asistido</span>
              </div>
            </a>
          </nav>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="footer-app-name">DATAX Intelligence Suite</div>
        <div class="footer-version">Sistema Integral de Auditoría Financiera</div>
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
      height: calc(100vh - 56px);
      padding: 16px 12px;
    }
    .sidebar-scroll {
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
    }
    .sidebar-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section-badge-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 8px;
    }
    .system-number {
      font-size: 9px;
      font-weight: 700;
      color: #60a5fa;
      background: rgba(37, 99, 235, 0.15);
      padding: 1px 4px;
      border-radius: 2px;
      border: 1px solid rgba(37, 99, 235, 0.3);
    }
    .section-heading {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-subtle);
      letter-spacing: 0.05em;
    }
    .nav-menu {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      text-decoration: none;
      transition: all 0.12s ease;
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
      width: 3px;
      height: 20px;
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
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .nav-desc {
      font-size: 10px;
      color: var(--text-subtle);
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .sidebar-footer {
      border-top: 1px solid var(--border-subtle);
      padding: 12px 8px 4px 8px;
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
    .mono {
      font-family: var(--font-mono);
    }
  `]
})
export class SidebarComponent {}
