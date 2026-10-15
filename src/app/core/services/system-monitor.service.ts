import { Injectable, inject, signal, computed } from '@angular/core';
import { ExternoService } from './externo.service';
import { InternoService } from './interno.service';
import { ReportesService } from './reportes.service';
import { ServiceHealth } from '../models/system.model';

@Injectable({
  providedIn: 'root'
})
export class SystemMonitorService {
  private readonly externoService = inject(ExternoService);
  private readonly internoService = inject(InternoService);
  private readonly reportesService = inject(ReportesService);

  readonly externoHealth = signal<ServiceHealth>({
    id: 'externo',
    name: 'Prospector Externo',
    port: 8000,
    url: 'http://localhost:8000',
    status: 'DOWN',
    latencyMs: 0,
    lastChecked: new Date().toISOString()
  });

  readonly internoHealth = signal<ServiceHealth>({
    id: 'interno',
    name: 'Prospector Interno',
    port: 8001,
    url: 'http://localhost:8001',
    status: 'DOWN',
    latencyMs: 0,
    lastChecked: new Date().toISOString()
  });

  readonly reportesHealth = signal<ServiceHealth>({
    id: 'reportes',
    name: 'Reportes Perdidos',
    port: 8002,
    url: 'http://localhost:8002',
    status: 'DOWN',
    latencyMs: 0,
    lastChecked: new Date().toISOString()
  });

  readonly isAllOperational = computed(() => {
    return (
      this.externoHealth().status === 'UP' &&
      this.internoHealth().status === 'UP' &&
      this.reportesHealth().status === 'UP'
    );
  });

  readonly operationalCount = computed(() => {
    let count = 0;
    if (this.externoHealth().status === 'UP') count++;
    if (this.internoHealth().status === 'UP') count++;
    if (this.reportesHealth().status === 'UP') count++;
    return count;
  });

  constructor() {
    this.refreshAll();
    // Run periodically every 30 seconds
    setInterval(() => this.refreshAll(), 30000);
  }

  refreshAll(): void {
    this.checkExterno();
    this.checkInterno();
    this.checkReportes();
  }

  private checkExterno(): void {
    const start = performance.now();
    this.externoService.checkHealth().subscribe({
      next: (res) => {
        const latency = Math.round(performance.now() - start);
        this.externoHealth.set({
          id: 'externo',
          name: 'Prospector Externo',
          port: 8000,
          url: 'http://localhost:8000',
          status: res.status === 'UP' || res.status === 'healthy' || res.status === 'OFFLINE_CACHE' ? 'UP' : 'DEGRADED',
          latencyMs: latency,
          details: res.service || 'Catálogo indexado',
          lastChecked: new Date().toISOString()
        });
      },
      error: () => {
        this.externoHealth.set({
          id: 'externo',
          name: 'Prospector Externo',
          port: 8000,
          url: 'http://localhost:8000',
          status: 'DOWN',
          latencyMs: 0,
          details: 'Sin conexion a puerto 8000',
          lastChecked: new Date().toISOString()
        });
      }
    });
  }

  private checkInterno(): void {
    const start = performance.now();
    this.internoService.checkHealth().subscribe({
      next: (res) => {
        const latency = Math.round(performance.now() - start);
        this.internoHealth.set({
          id: 'interno',
          name: 'Prospector Interno',
          port: 8001,
          url: 'http://localhost:8001',
          status: res.status === 'healthy' ? 'UP' : 'DEGRADED',
          latencyMs: latency,
          version: res.version,
          details: res.service,
          lastChecked: new Date().toISOString()
        });
      },
      error: () => {
        this.internoHealth.set({
          id: 'interno',
          name: 'Prospector Interno',
          port: 8001,
          url: 'http://localhost:8001',
          status: 'DOWN',
          latencyMs: 0,
          details: 'Sin conexion a puerto 8001',
          lastChecked: new Date().toISOString()
        });
      }
    });
  }

  private checkReportes(): void {
    const start = performance.now();
    this.reportesService.checkHealth().subscribe({
      next: (res) => {
        const latency = Math.round(performance.now() - start);
        this.reportesHealth.set({
          id: 'reportes',
          name: 'Reportes Perdidos',
          port: 8002,
          url: 'http://localhost:8002',
          status: res.status === 'healthy' ? 'UP' : 'DEGRADED',
          latencyMs: latency,
          version: res.version,
          details: res.service,
          lastChecked: new Date().toISOString()
        });
      },
      error: () => {
        this.reportesHealth.set({
          id: 'reportes',
          name: 'Reportes Perdidos',
          port: 8002,
          url: 'http://localhost:8002',
          status: 'DOWN',
          latencyMs: 0,
          details: 'Sin conexion a puerto 8002',
          lastChecked: new Date().toISOString()
        });
      }
    });
  }
}
