import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [],
  templateUrl: './skeleton-loader.component.html',
  styleUrls: ['./skeleton-loader.component.css']
})
export class SkeletonLoaderComponent {
  readonly variant = input<'table' | 'cards' | 'kpi' | 'panel'>('table');
  readonly rows = input<number>(6);
  readonly columns = input<number>(5);
  readonly label = input<string>('Cargando datos...');

  readonly rowIndexes = computed(() => Array.from({ length: Math.max(1, this.rows()) }, (_, i) => i));
  readonly colIndexes = computed(() =>
    Array.from({ length: Math.max(1, this.columns()) }, (_, i) => i)
  );
}
