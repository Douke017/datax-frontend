export type SystemStatusType = 'UP' | 'DOWN' | 'DEGRADED';

export interface ServiceHealth {
  id: string;
  name: string;
  port: number;
  url: string;
  status: SystemStatusType;
  latencyMs: number;
  version?: string;
  details?: string;
  lastChecked: string;
}

export interface TriMonolithStatus {
  externo: ServiceHealth;
  interno: ServiceHealth;
  reportes: ServiceHealth;
}
