import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { PredefinedViewResult, GoldDimensions } from '../../../core/models/analytics.model';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';

interface DataColumnDefinition {
  name: string;
  dataType: string;
  role: 'Clave Dimensión' | 'Partición' | 'Métrica Numérica' | 'Linaje Criptográfico' | 'Auditoría ETL';
  description: string;
  isNullable: boolean;
}

const DATA_DICTIONARY_COLUMNS: DataColumnDefinition[] = [
  {
    name: 'institucion_id',
    dataType: 'VARCHAR',
    role: 'Clave Dimensión',
    description: 'Código alfanumérico normalizado de la entidad emisora (ej. CRECER, DIACONIA, PRO_MUJER)',
    isNullable: false
  },
  {
    name: 'institucion_nombre',
    dataType: 'VARCHAR',
    role: 'Clave Dimensión',
    description: 'Denominación oficial completa de la entidad o emisor del reporte',
    isNullable: false
  },
  {
    name: 'gestion',
    dataType: 'INTEGER',
    role: 'Partición',
    description: 'Año calendario del reporte procesado (Clave primaria de partición física en Parquet)',
    isNullable: false
  },
  {
    name: 'mes',
    dataType: 'INTEGER',
    role: 'Partición',
    description: 'Mes de corte de la información numérica (1 a 12, subpartición física en Parquet)',
    isNullable: false
  },
  {
    name: 'cartera_bruta',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Volumen consolidado de cartera de colocaciones extraído del reporte fuente',
    isNullable: true
  },
  {
    name: 'cartera_vigente',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Colocaciones activas con cumplimiento regular de cronograma',
    isNullable: true
  },
  {
    name: 'cartera_vencida',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Colocaciones con amortización impaga fuera del plazo pactado',
    isNullable: true
  },
  {
    name: 'cartera_en_ejecucion',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Colocaciones en proceso formal de cobranza judicial',
    isNullable: true
  },
  {
    name: 'cartera_en_mora',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Sumatoria total de colocaciones vencidas y en ejecución',
    isNullable: true
  },
  {
    name: 'prevision_cartera',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Fondo de cobertura técnica preventiva asignado en el balance',
    isNullable: true
  },
  {
    name: 'total_activo',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Valor total consolidado de los activos declarados en el estado financiero',
    isNullable: true
  },
  {
    name: 'total_pasivo',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Valor total consolidado de las obligaciones y pasivos exigibles',
    isNullable: true
  },
  {
    name: 'total_patrimonio',
    dataType: 'DOUBLE',
    role: 'Métrica Numérica',
    description: 'Valor total consolidado del patrimonio neto institucional',
    isNullable: true
  },
  {
    name: 'source_file_sha256',
    dataType: 'VARCHAR(64)',
    role: 'Linaje Criptográfico',
    description: 'Firma digital SHA-256 del archivo inmutable resguardado en Capa Bronze del cual se extrajo este registro',
    isNullable: false
  },
  {
    name: 'transformed_at',
    dataType: 'TIMESTAMP',
    role: 'Auditoría ETL',
    description: 'Timestamp UTC en que el pipeline procesó y consolidó el registro en Capa Gold',
    isNullable: false
  }
];

@Component({
  selector: 'app-interno-activos',
  standalone: true,
  imports: [CommonModule, SlicePipe, KpiCardComponent],
  templateUrl: './interno-activos.component.html',
  styleUrl: './interno-activos.component.css'
})
export class InternoActivosComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);

  readonly activeSubTab = signal<'dictionary' | 'explorer'>('dictionary');
  readonly dimensions = signal<GoldDimensions | null>(null);
  readonly selectedInstitution = signal<string>('');
  readonly selectedGestion = signal<number | null>(null);
  readonly selectedMes = signal<number | null>(null);
  readonly resultLimit = signal<number>(50);

  readonly viewResult = signal<PredefinedViewResult | null>(null);
  readonly loadingData = signal<boolean>(false);
  readonly materializing = signal<boolean>(false);

  readonly dictionaryColumns = DATA_DICTIONARY_COLUMNS;

  ngOnInit(): void {
    this.loadDimensions();
    this.refreshCurrentView();
  }

  loadDimensions(): void {
    this.analyticsService.getDimensions().subscribe({
      next: (dims) => this.dimensions.set(dims),
      error: () => {}
    });
  }

  onInstitutionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedInstitution.set(val);
  }

  onGestionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedGestion.set(val ? Number(val) : null);
  }

  onMesChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedMes.set(val ? Number(val) : null);
  }

  onLimitChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.resultLimit.set(val);
  }

  refreshCurrentView(): void {
    this.loadingData.set(true);

    const req = {
      institutions: this.selectedInstitution() ? [this.selectedInstitution()] : undefined,
      gestion: this.selectedGestion() ?? undefined,
      mes: this.selectedMes() ?? undefined,
      limit: this.resultLimit()
    };

    // Usar la vista multidimensional de Capa Gold
    this.analyticsService.executePredefinedView('ranking-solvencia-cobertura', req).subscribe({
      next: (res) => {
        this.viewResult.set(res);
        this.loadingData.set(false);
      },
      error: () => {
        this.loadingData.set(false);
      }
    });
  }

  materializeDatamart(): void {
    this.materializing.set(true);
    this.analyticsService.materializeGold().subscribe({
      next: () => {
        this.materializing.set(false);
        this.loadDimensions();
        this.refreshCurrentView();
      },
      error: () => {
        this.materializing.set(false);
      }
    });
  }

  isNumericCol(col: string): boolean {
    return (
      col.includes('cartera') ||
      col.includes('total') ||
      col.includes('activo') ||
      col.includes('pasivo') ||
      col.includes('patrimonio') ||
      col.includes('prevision') ||
      col.includes('ratio') ||
      col === 'gestion' ||
      col === 'mes'
    );
  }

  formatNumber(val: any): string {
    if (typeof val !== 'number') return String(val ?? '-');
    return val.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  exportToCsv(): void {
    const res = this.viewResult();
    if (!res || !res.records || !res.records.length) return;
    const cols = res.columns;
    const header = cols.join(',');
    const rows = res.records.map((r) =>
      cols.map((c) => {
        const val = r[c];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      }).join(',')
    );
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `datax_gold_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToJson(): void {
    const res = this.viewResult();
    if (!res || !res.records || !res.records.length) return;
    const jsonStr = JSON.stringify(res.records, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `datax_gold_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
