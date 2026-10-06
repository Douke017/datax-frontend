import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
  template: `
    <div class="layout-container">
      <app-header />
      <div class="layout-body">
        <app-sidebar />
        <main class="layout-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .layout-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: var(--bg-app);
    }
    .layout-body {
      display: flex;
      flex: 1;
      height: calc(100vh - 56px);
      overflow: hidden;
    }
    .layout-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      background: var(--bg-app);
    }
  `]
})
export class LayoutComponent {}
