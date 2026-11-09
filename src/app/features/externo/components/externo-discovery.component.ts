import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExternoStore } from '../externo.store';
import {
  OpenDiscoveryCandidate,
  OpenDiscoverySearchRequest,
  PromoteCandidateRequest
} from '../../../core/models/catalog.model';

@Component({
  selector: 'app-externo-discovery',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './externo-discovery.component.html',
  styleUrls: ['./externo-discovery.component.css']
})
export class ExternoDiscoveryComponent {
  readonly store = inject(ExternoStore);

  readonly availableExtensions = ['.xlsx', '.xls', '.csv', '.pdf', '.zip', '.docx'];

  queryText = 'estadísticas cartera tasas boletín financiero';
  sectorFilter = 'TODOS';
  trustedDomainsOnly = true;
  minCombinedScore = 45;
  liveProbe = true;
  newSeedUrl = '';
  readonly customSeeds = signal<string[]>([]);
  readonly selectedExtensions = signal<string[]>(['.xlsx', '.xls', '.csv', '.pdf', '.zip']);

  // Modal de promoción al catálogo oficial
  readonly promotingCandidate = signal<OpenDiscoveryCandidate | null>(null);
  promoteSourceId = '';
  promoteSourceName = '';
  promoteCategory: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'MONTHLY';
  promoteWorkflow: 'html' | 'javascript' | 'api' = 'html';
  readonly promoteFeedback = signal<string>('');
  readonly isPromoting = signal<boolean>(false);

  toggleExtension(ext: string): void {
    const current = this.selectedExtensions();
    if (current.includes(ext)) {
      if (current.length > 1) {
        this.selectedExtensions.set(current.filter((e) => e !== ext));
      }
    } else {
      this.selectedExtensions.set([...current, ext]);
    }
  }

  addCustomSeed(): void {
    const u = this.newSeedUrl.trim();
    if (!u) return;
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      this.promoteFeedback.set('La dirección semilla debe iniciar con http:// o https://');
      return;
    }
    if (!this.customSeeds().includes(u)) {
      this.customSeeds.set([...this.customSeeds(), u]);
    }
    this.newSeedUrl = '';
  }

  removeCustomSeed(index: number): void {
    this.customSeeds.set(this.customSeeds().filter((_, i) => i !== index));
  }

  onExecuteDiscovery(): void {
    this.promoteFeedback.set('');
    const req: OpenDiscoverySearchRequest = {
      query: this.queryText.trim() || 'estadísticas financieras',
      sector: this.sectorFilter,
      target_extensions: this.selectedExtensions(),
      seed_urls: this.customSeeds(),
      trusted_domains_only: this.trustedDomainsOnly,
      min_combined_score: Number(this.minCombinedScore) || 40
    };
    this.store.runOpenDiscovery(req, this.liveProbe);
  }

  openPromoteModal(cand: OpenDiscoveryCandidate): void {
    const hostSlug = cand.domain
      .replace(/^www\./i, '')
      .split('.')[0]
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    this.promotingCandidate.set(cand);
    this.promoteSourceId = hostSlug || 'nueva_fuente';
    this.promoteSourceName = cand.title;
    this.promoteCategory = 'MONTHLY';
    this.promoteWorkflow = 'html';
    this.promoteFeedback.set('');
  }

  closePromoteModal(): void {
    this.promotingCandidate.set(null);
  }

  confirmPromotion(): void {
    const cand = this.promotingCandidate();
    if (!cand) return;
    const sid = this.promoteSourceId.trim().toLowerCase();
    const sname = this.promoteSourceName.trim();
    if (!sid || !sname) return;

    this.isPromoting.set(true);
    const payload: PromoteCandidateRequest = {
      source_id: sid,
      name: sname,
      update_category: this.promoteCategory,
      workflow: this.promoteWorkflow
    };

    this.store.promoteCandidate(cand.candidate_id, payload).subscribe({
      next: (created) => {
        this.isPromoting.set(false);
        this.promotingCandidate.set(null);
        this.promoteFeedback.set(
          `Fuente '${created.source_id.toUpperCase()} — ${created.name}' incorporada exitosamente al catálogo oficial.`
        );
      },
      error: (err) => {
        this.isPromoting.set(false);
        this.promoteFeedback.set(
          err.error?.detail || 'No se pudo incorporar la fuente al catálogo.'
        );
      }
    });
  }

  formatSectorLabel(sector: string): string {
    const map: Record<string, string> = {
      MONETARIO_FINANCIERO: 'Monetario y Cambiario',
      MERCADO_VALORES: 'Mercado de Valores',
      MICROFINANZAS_IFD: 'Microfinanzas e IFD',
      SUPERVISION_FINANCIERA: 'Supervisión Financiera',
      MACROECONOMIA: 'Macroeconomía Oficial',
      PENSIONES_SEGUROS: 'Pensiones y Seguros',
      ORGANISMOS_MULTILATERALES: 'Organismo Multilateral',
      FISCAL_TESORO: 'Fiscal y Tesoro Público'
    };
    return map[sector] || sector;
  }
}
