import { Injectable, signal } from '@angular/core';

export interface InstitutionOption {
  id: string;
  code: string;
  name: string;
  description: string;
}

export const INSTITUTIONS: InstitutionOption[] = [
  {
    id: 'asfi',
    code: 'ASFI',
    name: 'Autoridad de Supervisión del Sistema Financiero',
    description: 'Regulación del Sistema Financiero'
  },
  {
    id: 'bcb',
    code: 'BCB',
    name: 'Banco Central de Bolivia',
    description: 'Banca Central y Política Monetaria'
  },
  {
    id: 'finrural',
    code: 'FINRURAL',
    name: 'Asoc. de Entidades Financieras de Desarrollo',
    description: 'Microfinanzas y Desarrollo Productivo'
  },
  {
    id: 'bbv',
    code: 'BBV',
    name: 'Bolsa Boliviana de Valores',
    description: 'Mercado de Valores'
  }
];

const STORAGE_KEY = 'datax_active_institution';

function getInitialInstitutionId(): string {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && INSTITUTIONS.some((i) => i.id === saved)) {
        return saved;
      }
    } catch {
      // Ignorar fallos de acceso a localStorage
    }
  }
  return 'asfi';
}

@Injectable({
  providedIn: 'root'
})
export class InstitutionStateService {
  readonly currentInstitutionId = signal<string>(getInitialInstitutionId());

  setInstitution(id: string): void {
    if (INSTITUTIONS.some((i) => i.id === id)) {
      this.currentInstitutionId.set(id);
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, id);
        } catch {
          // Ignorar fallos de escritura
        }
      }
    }
  }

  getCurrentInstitution(): InstitutionOption {
    const current = INSTITUTIONS.find((i) => i.id === this.currentInstitutionId());
    return current || INSTITUTIONS[0];
  }
}

