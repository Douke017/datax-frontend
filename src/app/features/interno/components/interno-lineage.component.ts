import { Component } from '@angular/core';

@Component({
  selector: 'app-interno-lineage',
  standalone: true,
  template: `
    <div class="lineage-container">
      <div class="lineage-header">
        <div>
          <span class="lineage-tag mono">CADENA DE CUSTODIA Y PROCEDENCIA</span>
          <h2 class="lineage-title">Linaje Criptográfico de la Información Institucional</h2>
          <p class="lineage-desc">
            Trazabilidad integral desde la publicación en el portal emisor hasta los indicadores financieros consolidados.
            Garantía inmutable para auditorías de cumplimiento normativo y fiscalizaciones ASFI.
          </p>
        </div>
        <span class="badge-audit">AUDITORÍA CERTIFICADA</span>
      </div>

      <!-- Flowchart Steps -->
      <div class="flow-steps">
        <!-- Step 1 -->
        <div class="step-card">
          <div class="step-top">
            <span class="step-badge mono">ETAPA 01</span>
            <span class="step-sub">PROSPECTOR EXTERNO</span>
          </div>
          <h3 class="step-title">Detección en Portal Oficial</h3>
          <p class="step-desc">
            Rastreo periódico del portal institucional (BBV, FINRURAL, BCB). Se indexa la URL original, encabezados HTTP (ETag, Last-Modified) y tamaño reportado.
          </p>
          <div class="step-meta">
            <span class="meta-item mono">Entrada: Portal Web</span>
            <span class="meta-item mono">Salida: URL Candidata</span>
          </div>
        </div>

        <div class="step-arrow">→</div>

        <!-- Step 2 -->
        <div class="step-card">
          <div class="step-top">
            <span class="step-badge mono">ETAPA 02</span>
            <span class="step-sub">CONTROL DE ADMISIÓN</span>
          </div>
          <h3 class="step-title">Evaluación Pre-Flight Gatekeeper</h3>
          <p class="step-desc">
            Evaluación en menos de 20 ms. Verifica si el archivo ya existe en custodia o si está en tránsito por otro analista, asignando clave de idempotencia única.
          </p>
          <div class="step-meta">
            <span class="meta-item mono">Entrada: Solicitud de Ingesta</span>
            <span class="meta-item mono">Salida: Veredicto de Admisión</span>
          </div>
        </div>

        <div class="step-arrow">→</div>

        <!-- Step 3 -->
        <div class="step-card">
          <div class="step-top">
            <span class="step-badge mono">ETAPA 03</span>
            <span class="step-sub">CUSTODIA ORIGINAL</span>
          </div>
          <h3 class="step-title">Resguardo Físico y Firma SHA-256</h3>
          <p class="step-desc">
            Descarga respetuosa regulada por disyuntores. Cálculo de hash criptográfico SHA-256 en vuelo y renombrado atómico inmutable en disco.
          </p>
          <div class="step-meta">
            <span class="meta-item mono">Entrada: Flujo de Bytes</span>
            <span class="meta-item mono">Salida: Archivo con Hash SHA-256</span>
          </div>
        </div>

        <div class="step-arrow">→</div>

        <!-- Step 4 -->
        <div class="step-card highlight">
          <div class="step-top">
            <span class="step-badge mono">ETAPA 04</span>
            <span class="step-sub">SUPERVISIÓN FINANCIERA</span>
          </div>
          <h3 class="step-title">Consolidación de Indicadores</h3>
          <p class="step-desc">
            Normalización contable y agregación en datamarts analíticos. Proyección de índices de mora, solvencia, cobertura de previsiones y cartera bruta.
          </p>
          <div class="step-meta">
            <span class="meta-item mono">Entrada: Datos Normalizados</span>
            <span class="meta-item mono">Salida: Ratios Contables Auditados</span>
          </div>
        </div>
      </div>

      <!-- Compliance Principles Table -->
      <div class="compliance-card">
        <h3 class="compliance-title">Garantías de Seguridad y Transparencia Operativa</h3>
        <div class="guarantees-grid">
          <div class="guarantee-item">
            <span class="guarantee-name">Inmutabilidad en Almacenamiento</span>
            <span class="guarantee-desc">Ningún archivo resguardado puede ser sobreescrito. Toda actualización genera un nuevo registro con fecha y hash único.</span>
          </div>
          <div class="guarantee-item">
            <span class="guarantee-name">Verificación Criptográfica Continua</span>
            <span class="guarantee-desc">La integridad de los archivos se audita recalculando el hash contra el contenido físico en disco, impidiendo alteraciones silenciosas.</span>
          </div>
          <div class="guarantee-item">
            <span class="guarantee-name">Protección de Infraestructura Externa</span>
            <span class="guarantee-desc">El uso de disyuntores de red (Circuit Breakers) y control de tasa (Token Bucket) evita penalizaciones por denegación de servicio.</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lineage-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .lineage-header {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 24px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
    }
    .lineage-tag {
      font-size: 10px;
      font-weight: 700;
      color: #60a5fa;
      letter-spacing: 0.05em;
    }
    .lineage-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
      margin-top: 4px;
    }
    .lineage-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 6px;
      max-width: 800px;
      line-height: 1.5;
    }
    .badge-audit {
      font-size: 10px;
      font-weight: 700;
      font-family: var(--font-mono);
      background: rgba(37, 99, 235, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(37, 99, 235, 0.3);
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      white-space: nowrap;
    }
    .flow-steps {
      display: flex;
      align-items: stretch;
      gap: 12px;
    }
    .step-card {
      flex: 1;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.15s ease;
    }
    .step-card:hover {
      border-color: var(--border-medium);
    }
    .step-card.highlight {
      border-color: rgba(37, 99, 235, 0.4);
      background: rgba(37, 99, 235, 0.04);
    }
    .step-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .step-badge {
      font-size: 9px;
      font-weight: 700;
      color: #60a5fa;
      background: rgba(37, 99, 235, 0.12);
      border: 1px solid rgba(37, 99, 235, 0.25);
      padding: 1px 5px;
      border-radius: 2px;
    }
    .step-sub {
      font-size: 9px;
      font-weight: 700;
      color: var(--text-subtle);
      letter-spacing: 0.04em;
    }
    .step-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
    }
    .step-desc {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.4;
      flex: 1;
    }
    .step-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-top: 10px;
      border-top: 1px solid var(--border-subtle);
    }
    .meta-item {
      font-size: 10px;
      color: var(--text-subtle);
    }
    .step-arrow {
      display: flex;
      align-items: center;
      color: var(--text-subtle);
      font-size: 18px;
      font-weight: 700;
      user-select: none;
    }
    .compliance-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .compliance-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
    }
    .guarantees-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    .guarantee-item {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .guarantee-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-main);
    }
    .guarantee-desc {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .mono {
      font-family: var(--font-mono);
    }
  `]
})
export class InternoLineageComponent {}
