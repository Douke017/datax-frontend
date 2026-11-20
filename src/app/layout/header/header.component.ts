import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SystemMonitorService } from '../../core/services/system-monitor.service';
import { CommandPaletteService } from '../../core/services/command-palette.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  readonly monitor = inject(SystemMonitorService);
  readonly palette = inject(CommandPaletteService);

  openGlobalSearch(): void {
    this.palette.open();
  }
}
