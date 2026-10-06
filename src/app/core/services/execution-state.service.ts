import { Injectable, signal } from '@angular/core';
import { BridgeSyncResponse } from '../models/reconciliation.model';
import { DetectedGap } from '../models/audit.model';

export interface RecoveryStep {
  step: number;
  title: string;
  detail: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  timestamp?: string;
}

export interface SavedSyncRecord {
  data: BridgeSyncResponse;
  timestamp: string;
}

export interface SavedRescueRecord {
  gap: DetectedGap;
  steps: RecoveryStep[];
  period: string;
  timestamp: string;
}

const SYNC_REPORTS_KEY = 'datax_sync_reports';
const RESCUE_HISTORY_KEY = 'datax_rescue_history';
const AUDIT_FILTER_KEY = 'datax_audit_filter';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // Retornar valor por defecto si falla el parseo
    }
  }
  return defaultValue;
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignorar cuotas excedidas o restricciones de storage
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class ExecutionStateService {
  // Mapa de últimos reportes de descarga por institución
  readonly syncReports = signal<Record<string, SavedSyncRecord>>(
    loadFromStorage<Record<string, SavedSyncRecord>>(SYNC_REPORTS_KEY, {})
  );

  // Mapa de últimos resultados de rescate por institución
  readonly rescueHistory = signal<Record<string, SavedRescueRecord>>(
    loadFromStorage<Record<string, SavedRescueRecord>>(RESCUE_HISTORY_KEY, {})
  );

  // Filtro activo en matriz de auditoría
  readonly auditFilter = signal<string>(
    loadFromStorage<string>(AUDIT_FILTER_KEY, 'ALL')
  );

  /**
   * Guarda el resultado de un lote de descarga para una institución.
   */
  saveSyncReport(sourceId: string, data: BridgeSyncResponse): void {
    const record: SavedSyncRecord = {
      data,
      timestamp: new Date().toISOString()
    };
    this.syncReports.update((prev) => {
      const next = { ...prev, [sourceId]: record };
      saveToStorage(SYNC_REPORTS_KEY, next);
      return next;
    });
  }

  /**
   * Obtiene el último reporte de descarga para una institución.
   */
  getSyncReport(sourceId: string): SavedSyncRecord | null {
    return this.syncReports()[sourceId] || null;
  }

  /**
   * Elimina el reporte de descarga de una institución específica.
   */
  clearSyncReport(sourceId: string): void {
    this.syncReports.update((prev) => {
      const next = { ...prev };
      delete next[sourceId];
      saveToStorage(SYNC_REPORTS_KEY, next);
      return next;
    });
  }

  /**
   * Guarda el resultado y las etapas de una recuperación asistida.
   */
  saveRescueExecution(
    sourceId: string,
    execution: { gap: DetectedGap; steps: RecoveryStep[]; period: string }
  ): void {
    const record: SavedRescueRecord = {
      gap: execution.gap,
      steps: execution.steps,
      period: execution.period,
      timestamp: new Date().toISOString()
    };
    this.rescueHistory.update((prev) => {
      const next = { ...prev, [sourceId]: record };
      saveToStorage(RESCUE_HISTORY_KEY, next);
      return next;
    });
  }

  /**
   * Obtiene el último resultado de rescate para una institución.
   */
  getRescueExecution(sourceId: string): SavedRescueRecord | null {
    return this.rescueHistory()[sourceId] || null;
  }

  /**
   * Elimina el resultado de rescate de una institución.
   */
  clearRescueExecution(sourceId: string): void {
    this.rescueHistory.update((prev) => {
      const next = { ...prev };
      delete next[sourceId];
      saveToStorage(RESCUE_HISTORY_KEY, next);
      return next;
    });
  }

  /**
   * Actualiza y persiste el filtro activo de la matriz de auditoría.
   */
  setAuditFilter(filter: string): void {
    this.auditFilter.set(filter);
    saveToStorage(AUDIT_FILTER_KEY, filter);
  }
}
