import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  INSTITUTIONS,
  InstitutionStateService
} from '../../core/services/institution-state.service';
import { SystemMonitorService } from '../../core/services/system-monitor.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  readonly monitor = inject(SystemMonitorService);
  readonly institutionState = inject(InstitutionStateService);
  readonly institutions = INSTITUTIONS;

  onInstitutionChange(institutionId: string): void {
    this.institutionState.setInstitution(institutionId);
  }
}
