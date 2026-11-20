import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExternoStore } from '../externo.store';
import { ToastService } from '../../../core/services/toast.service';
import {
  AlertChannelConfig,
  AlertChannelType,
  AlertSeverity,
  AlertStatus,
  StructuralAlert
} from '../../../core/models/catalog.model';
import {
  DrawerTab,
  SlideOverDrawerComponent
} from '../../../shared/components/slide-over-drawer/slide-over-drawer.component';
import { formatIsoDateShort } from '../../../shared/utils/format.utils';

@Component({
  selector: 'app-externo-alerts',
  standalone: true,
  imports: [FormsModule, SlideOverDrawerComponent],
  templateUrl: './externo-alerts.component.html',
  styleUrls: ['./externo-alerts.component.css']
})
export class ExternoAlertsComponent {
  readonly store = inject(ExternoStore);
  readonly toast = inject(ToastService);
  readonly formatDate = formatIsoDateShort;

  selectedSourceToVerify = 'bcb';
  readonly severityFilter = signal<'ALL' | AlertSeverity>('ALL');
  readonly statusFilter = signal<'ALL' | AlertStatus>('ALL');

  // Slide-over drawer for inspecting diff + lifecycle + delivery logs
  readonly selectedAlert = signal<StructuralAlert | null>(null);
  readonly drawerTab = signal<string>('diff');
  readonly updatingLifecycle = signal<boolean>(false);

  muteHours = 24;
  ticketUrlInput = '';
  resolutionNoteInput = '';
  assigneeInput = '';

  // Push channels form
  channelName = '';
  channelType: AlertChannelType = 'WEBHOOK';
  channelMinSeverity: AlertSeverity = 'ALTA';
  channelEndpointUrl = '';
  channelSecretEnvVar = '';
  channelSmtpHost = '';
  channelSmtpRecipients = '';
  readonly savingChannel = signal<boolean>(false);
  readonly testingChannelId = signal<string | null>(null);

  readonly drawerTabs = computed<DrawerTab[]>(() => [
    { id: 'diff', label: 'Diff Estructural' },
    { id: 'lifecycle', label: 'Ciclo de Vida' },
    {
      id: 'deliveries',
      label: 'Despachos Push',
      badge: this.selectedAlert()?.delivery_logs?.length ?? 0
    }
  ]);

  readonly filteredAlerts = computed(() => {
    const sev = this.severityFilter();
    const st = this.statusFilter();
    return this.store.alerts().filter((a) => {
      if (sev !== 'ALL' && a.severity !== sev) return false;
      const alertStatus = a.status || (a.resolved ? 'RESUELTA' : 'ABIERTA');
      if (st !== 'ALL' && alertStatus !== st) return false;
      return true;
    });
  });

  readonly domApiAlertsCount = computed(
    () =>
      this.store
        .alerts()
        .filter(
          (a) =>
            a.alert_code === 'DOM_CHANGED' ||
            a.alert_code === 'API_CHANGED' ||
            a.alert_code === 'VOLUME_DROP'
        ).length
  );

  onVerifyLive(): void {
    if (!this.selectedSourceToVerify) return;
    this.store.verifyStructureLive(this.selectedSourceToVerify);
  }

  onOpenReport(sourceId: string): void {
    this.store.openMaintenanceReport(sourceId);
  }

  openAlertDrawer(alert: StructuralAlert): void {
    this.selectedAlert.set(alert);
    this.drawerTab.set('diff');
    this.ticketUrlInput = alert.ticket_url || '';
    this.resolutionNoteInput = alert.resolution_note || '';
    this.assigneeInput = alert.assignee || '';
  }

  closeAlertDrawer(): void {
    this.selectedAlert.set(null);
  }

  transitionAlert(nextStatus: AlertStatus): void {
    const alert = this.selectedAlert();
    if (!alert) return;

    let mutedUntil: string | null = null;
    if (nextStatus === 'SILENCIADA') {
      const hours = Math.max(1, Number(this.muteHours) || 24);
      mutedUntil = new Date(Date.now() + hours * 3600_000).toISOString();
    }

    this.updatingLifecycle.set(true);
    this.store
      .updateAlertLifecycle(alert.alert_id, {
        status: nextStatus,
        assignee: this.assigneeInput.trim() || null,
        ticket_url: this.ticketUrlInput.trim() || null,
        muted_until: mutedUntil,
        resolution_note: this.resolutionNoteInput.trim() || null
      })
      .subscribe({
        next: (updated) => {
          this.updatingLifecycle.set(false);
          this.selectedAlert.set(updated);
          this.toast.success(
            `Alerta transicionada a ${updated.status}`,
            `${updated.source_id.toUpperCase()} — ${updated.alert_code}`
          );
        },
        error: (err) => {
          this.updatingLifecycle.set(false);
          this.toast.error(
            'Error al actualizar alerta',
            err?.error?.detail || 'Verifique los campos requeridos.'
          );
        }
      });
  }

  onSaveChannel(): void {
    const name = this.channelName.trim();
    if (name.length < 2) {
      this.toast.warning('Nombre requerido', 'Ingrese un nombre descriptivo para el canal.');
      return;
    }
    const payload: AlertChannelConfig = {
      name,
      channel_type: this.channelType,
      enabled: true,
      min_severity: this.channelMinSeverity,
      endpoint_url: this.channelType !== 'SMTP' ? this.channelEndpointUrl.trim() || null : null,
      secret_env_var: this.channelSecretEnvVar.trim() || null,
      smtp_host: this.channelType === 'SMTP' ? this.channelSmtpHost.trim() || null : null,
      smtp_recipients:
        this.channelType === 'SMTP'
          ? this.channelSmtpRecipients
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : []
    };

    this.savingChannel.set(true);
    this.store.saveAlertChannel(payload).subscribe({
      next: (saved) => {
        this.savingChannel.set(false);
        this.channelName = '';
        this.channelEndpointUrl = '';
        this.channelSecretEnvVar = '';
        this.toast.success(`Canal '${saved.name}' guardado`, `Tipo: ${saved.channel_type}`);
      },
      error: (err) => {
        this.savingChannel.set(false);
        this.toast.error('Error al guardar canal', err?.error?.detail || 'Verifique la configuración.');
      }
    });
  }

  onTestChannel(channelId: string): void {
    this.testingChannelId.set(channelId);
    this.store.testAlertChannel(channelId).subscribe({
      next: (log) => {
        this.testingChannelId.set(null);
        if (log.delivered) {
          this.toast.success(`Canal '${log.channel_name}' verificado`, log.detail || 'Entrega OK');
        } else {
          this.toast.warning(`Fallo de entrega en '${log.channel_name}'`, log.detail || 'Revise endpoint/env.');
        }
      },
      error: (err) => {
        this.testingChannelId.set(null);
        this.toast.error('Error probando canal', err?.error?.detail || 'Reintente la prueba.');
      }
    });
  }

  onDeleteChannel(channelId: string): void {
    this.store.deleteAlertChannel(channelId).subscribe({
      next: () => this.toast.info('Canal eliminado correctamente'),
      error: () => this.toast.error('No se pudo eliminar el canal')
    });
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
      DOM_CHANGED: 'Cambio Estructural Web (Selectores / XPath)',
      API_CHANGED: 'Cambio de Esquema JSON / API',
      VOLUME_DROP: 'Caída Anómala de Volumen (HTTP 200)',
      TLS_HOLD: 'Fallo de Certificado Digital TLS',
      BOT_BLOCKED: 'Bloqueo Perimetral WAF / Firewall',
      HTTP_5XX: 'Error de Servidor en Origen',
      BUDGET_LIMIT: 'Límite de Presupuesto Alcanzado',
      ACCESS_TIMEOUT: 'Tiempo de Espera Excedido'
    };
    return labels[code] || code;
  }
}
