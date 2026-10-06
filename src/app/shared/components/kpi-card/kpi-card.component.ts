import { Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  template: `
    <div class="kpi-card" [class]="'tone-' + tone()">
      <div class="kpi-header">
        <span class="kpi-title">{{ title() }}</span>
        @if (badgeText()) {
          <span class="kpi-badge">{{ badgeText() }}</span>
        }
      </div>
      <div class="kpi-value-container">
        <span class="kpi-value">{{ value() }}</span>
        @if (unit()) {
          <span class="kpi-unit">{{ unit() }}</span>
        }
      </div>
      @if (subtitle()) {
        <div class="kpi-subtitle">{{ subtitle() }}</div>
      }
    </div>
  `,
  styles: [`
    .kpi-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.15s ease;
    }
    .kpi-card:hover {
      border-color: var(--border-medium);
    }
    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .kpi-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .kpi-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      background: var(--bg-surface-elevated);
      color: var(--text-subtle);
      border: 1px solid var(--border-subtle);
    }
    .kpi-value-container {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .kpi-value {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      font-family: var(--font-mono);
      line-height: 1.1;
    }
    .kpi-unit {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted);
    }
    .kpi-subtitle {
      font-size: 12px;
      color: var(--text-subtle);
      line-height: 1.4;
    }

    /* Tones */
    .tone-default .kpi-value { color: var(--text-main); }
    .tone-success { border-left: 3px solid var(--success); }
    .tone-success .kpi-value { color: #34d399; }
    .tone-warning { border-left: 3px solid var(--warning); }
    .tone-warning .kpi-value { color: #fbbf24; }
    .tone-danger { border-left: 3px solid var(--danger); }
    .tone-danger .kpi-value { color: #f87171; }
    .tone-info { border-left: 3px solid var(--info); }
    .tone-info .kpi-value { color: #38bdf8; }
    .tone-purple { border-left: 3px solid var(--purple); }
    .tone-purple .kpi-value { color: #c084fc; }
  `]
})
export class KpiCardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly subtitle = input<string>();
  readonly unit = input<string>();
  readonly tone = input<'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'>('default');
  readonly badgeText = input<string>();
}
