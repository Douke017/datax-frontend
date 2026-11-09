import { Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.css']
})
export class KpiCardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly subtitle = input<string>();
  readonly unit = input<string>();
  readonly tone = input<'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'>('default');
  readonly badgeText = input<string>();
}
