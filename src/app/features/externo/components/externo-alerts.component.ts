import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExternoStore } from '../externo.store';

@Component({
  selector: 'app-externo-alerts',
  standalone: true,
  imports: [FormsModule, DatePipe, SlicePipe],
  templateUrl: './externo-alerts.component.html',
  styleUrls: ['./externo-alerts.component.css']
})
export class ExternoAlertsComponent {
  readonly store = inject(ExternoStore);

  selectedSourceToVerify = 'bcb';
  severityFilter = signal<'ALL' | 'CRITICA' | 'ALTA' | 'MEDIA'>('ALL');
  readonly copiedMarkdown = signal<boolean>(false);

  readonly filteredAlerts = computed(() => {
    const sev = this.severityFilter();
    const list = this.store.alerts();
    if (sev === 'ALL') return list;
    return list.filter((a) => a.severity === sev);
  });

  readonly domApiAlertsCount = computed(() =>
    this.store
      .alerts()
      .filter((a) => a.alert_code === 'DOM_CHANGED' || a.alert_code === 'API_CHANGED').length
  );

  readonly protocolAlertsCount = computed(() =>
    this.store
      .alerts()
      .filter((a) => a.alert_code !== 'DOM_CHANGED' && a.alert_code !== 'API_CHANGED').length
  );

  onVerifyLive(): void {
    if (!this.selectedSourceToVerify) return;
    this.store.verifyStructureLive(this.selectedSourceToVerify);
  }

  onOpenReport(sourceId: string): void {
    this.store.openMaintenanceReport(sourceId);
  }

  copyMarkdownReport(markdown: string): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(markdown).then(() => {
        this.copiedMarkdown.set(true);
        setTimeout(() => this.copiedMarkdown.set(false), 2500);
      });
    }
  }

  downloadMarkdownReport(sourceId: string, reportId: string, markdown: string): void {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_mantenimiento_${sourceId}_${reportId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatAlertType(code: string): string {
    const labels: Record<string, string> = {
      DOM_CHANGED: 'Alteración Estructural Web (Selectores / XPath)',
      API_CHANGED: 'Cambio de Contrato en Servicio de Datos',
      TLS_HOLD: 'Fallo de Certificado Digital (TLS/SSL)',
      BOT_BLOCKED: 'Restricción Perimetral (Firewall / WAF)',
      HTTP_5XX: 'Indisponibilidad del Servidor Institucional',
      BUDGET_LIMIT: 'Agotamiento de Presupuesto de Navegación',
      ACCESS_TIMEOUT: 'Tiempo de Espera Excedido en Origen'
    };
    return labels[code] || code;
  }
}
