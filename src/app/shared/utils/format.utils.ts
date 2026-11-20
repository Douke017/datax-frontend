/**
 * Utilidades de formateo técnico, numérico y documental para DATAX (Datos en Bruto).
 * Preserva valores crudos sin imponer conversión financiera prematura; solo aplica
 * sufijos de unidad cuando el diccionario técnico declara explícitamente una unidad.
 */

const DECIMAL_FMT = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const INT_FMT = new Intl.NumberFormat('es-BO', {
  maximumFractionDigits: 0
});

export function formatDecimalBo(value: number | null | undefined, suffix: string = ''): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  const formatted = DECIMAL_FMT.format(Number(value));
  return suffix ? `${formatted} ${suffix}`.trim() : formatted;
}

export function formatPercentageBo(
  value: number | null | undefined,
  alreadyPercentScale: boolean = false
): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  const numeric = Number(value);
  const scaled = !alreadyPercentScale && Math.abs(numeric) <= 1.0 ? numeric * 100 : numeric;
  return `${DECIMAL_FMT.format(scaled)}%`;
}

export function formatIntegerBo(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0';
  }
  return INT_FMT.format(Math.round(Number(value)));
}

export function formatBytesBo(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes)) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const val = bytes / Math.pow(k, idx);
  return `${idx === 0 ? Math.round(val) : DECIMAL_FMT.format(val)} ${units[idx]}`;
}

export function formatSpeedBps(bps: number | null | undefined): string {
  if (!bps || bps <= 0) return '—';
  return `${formatBytesBo(bps)}/s`;
}

export function formatLatencyMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(Number(ms))) return '—';
  const val = Number(ms);
  if (val < 1) return `${val.toFixed(2)} ms`;
  if (val < 1000) return `${Math.round(val)} ms`;
  return `${(val / 1000).toFixed(2)} s`;
}

export function formatIsoDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

export function formatMetricCell(
  columnName: string,
  rawValue: unknown,
  unitHint?: string | null
): string {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return '—';
  }
  if (typeof rawValue === 'string') {
    return rawValue;
  }
  if (typeof rawValue === 'boolean') {
    return rawValue ? 'true' : 'false';
  }
  if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
    return String(rawValue);
  }

  const col = columnName.toLowerCase();
  const unit = (unitHint || '').trim();

  if (col === 'gestion' || col === 'mes' || col === 'year' || col === 'month') {
    return String(Math.trunc(rawValue));
  }
  if (col.includes('bytes') || col === 'size_bytes' || col === 'content_length_bytes') {
    return formatBytesBo(rawValue);
  }
  if (unit === '%' || col.endsWith('_pct')) {
    return formatPercentageBo(rawValue, true);
  }
  if (Number.isInteger(rawValue)) {
    return formatIntegerBo(rawValue);
  }
  return formatDecimalBo(rawValue, unit);
}

export function formatInteger(value: number | null | undefined): string {
  return formatIntegerBo(value);
}

export function formatBytes(bytes: number | null | undefined): string {
  return formatBytesBo(bytes);
}

export function formatPercentage(value: number | null | undefined): string {
  return formatPercentageBo(value, true);
}

export function isNumericMetricColumn(columnName: string): boolean {
  const col = columnName.toLowerCase();
  if (
    col.endsWith('_id') ||
    col.endsWith('_codigo') ||
    col.endsWith('_nombre') ||
    col.includes('sha256') ||
    col.includes('hash') ||
    col.includes('url') ||
    col.includes('path') ||
    col.includes('transformed_at') ||
    col.includes('fecha') ||
    col.includes('periodo')
  ) {
    return false;
  }
  return (
    col === 'gestion' ||
    col === 'mes' ||
    col.includes('count') ||
    col.includes('bytes') ||
    col.includes('rows') ||
    col.includes('total_') ||
    col.endsWith('_pct') ||
    col.endsWith('_ms') ||
    col.endsWith('_num')
  );
}
