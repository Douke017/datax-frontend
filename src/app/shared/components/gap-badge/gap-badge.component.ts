import { Component, input, computed } from '@angular/core';
import { GapStatus } from '../../../core/models/audit.model';

@Component({
  selector: 'app-gap-badge',
  standalone: true,
  template: `
    <span class="badge" [class]="badgeClass()">
      {{ label() }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class GapBadgeComponent {
  readonly status = input.required<GapStatus | string>();

  readonly label = computed(() => {
    switch (this.status()) {
      case 'CONFIRMED_ONLINE':
        return 'En Web Oficial';
      case 'PENDING_INGESTION':
        return 'Pendiente Descarga';
      case 'LOST_OFFLINE':
        return 'No Disponible';
      case 'RESCUED_ARCHIVE':
        return 'Recuperado';
      case 'CRITICAL_GAP':
        return 'No Localizado';
      case 'UNPUBLISHED':
        return 'No Publicado';
      default:
        return this.status();
    }
  });

  readonly badgeClass = computed(() => {
    switch (this.status()) {
      case 'CONFIRMED_ONLINE':
        return 'badge-success';
      case 'PENDING_INGESTION':
        return 'badge-warning';
      case 'LOST_OFFLINE':
        return 'badge-danger';
      case 'RESCUED_ARCHIVE':
        return 'badge-purple';
      case 'CRITICAL_GAP':
        return 'badge-danger';
      case 'UNPUBLISHED':
        return 'badge-info';
      default:
        return 'badge-info';
    }
  });
}
