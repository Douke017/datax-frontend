/**
 * Utilidades de formateo financiero, numérico y documental según estándares DATAX Bolivia.
 * Moneda nacional: 1.234.567,89 Bs.
 * Porcentajes: 1,23%
 * Múltiplos: 2,45x
 * Enteros: 1.234
 */

const BOLIVIAN_DECIMAL_FMT = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const BOLIVIAN_INT_FMT = new Intl.NumberFormat('es-BO', {
  maximumFractionDigits: 0
});

export function formatBolivianos(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `${BOLIVIAN_DECIMAL_FMT.format(Number(value))} Bs.`;
}

export function formatDecimalBo(value: number | null | undefined, suffix: string = ''): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  const formatted = BOLIVIAN_DECIMAL_FMT.format(Number(value));
  return suffix ? `${formatted} ${suffix}`.trim() : formatted;
}

export function formatPercentageBo(value: number | null | undefined, alreadyPercentScale: boolean = false): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  const numeric = Number(value);
  // Si el valor está en escala [0, 1] (ej. 0.0235 -> 2,35%), se multiplica por 100 salvo indicación contraria
  const scaled = !alreadyPercentScale && Math.abs(numeric) <= 1.5 ? numeric * 100 : numeric;
  return `${BOLIVIAN_DECIMAL_FMT.format(scaled)}%`;
}

export function formatMultipleBo(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `${BOLIVIAN_DECIMAL_FMT.format(Number(value))}x`;
}

export function formatIntegerBo(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0';
  }
  return BOLIVIAN_INT_FMT.format(Math.round(Number(value)));
}

export function formatBytesBo(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes)) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const val = bytes / Math.pow(k, idx);
  return `${idx === 0 ? Math.round(val) : BOLIVIAN_DECIMAL_FMT.format(val)} ${units[idx]}`;
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
  if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
    return String(rawValue);
  }

  const col = columnName.toLowerCase();
  const unit = (unitHint || '').trim();

  if (col === 'gestion' || col === 'mes') {
    return String(Math.trunc(rawValue));
  }
  if (
    unit === 'Veces (x)' ||
    unit.toLowerCase().includes('múltiplo') ||
    col.includes('cobertura')
  ) {
    return formatMultipleBo(rawValue);
  }
  if (
    unit === '%' ||
    col.endsWith('_pct') ||
    col.startsWith('ratio_') ||
    col.startsWith('tasa_') ||
    col.startsWith('peso_') ||
    col.includes('mora') ||
    col.includes('roe') ||
    col.includes('roa') ||
    col.includes('solvencia') ||
    col.includes('liquidez') ||
    col.includes('participacion')
  ) {
    const isAlreadyPct = col.startsWith('tasa_') || Math.abs(rawValue) > 1.5;
    return formatPercentageBo(rawValue, isAlreadyPct);
  }
  if (unit === 'Bs./USD' || col.includes('tipo_cambio')) {
    return `${BOLIVIAN_DECIMAL_FMT.format(rawValue)} Bs./USD`;
  }
  if (unit === 'Bs./UFV' || col.includes('ufv')) {
    return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 4, maximumFractionDigits: 5 }).format(rawValue);
  }
  if (unit === 'USD' || col.endsWith('_usd')) {
    return `${BOLIVIAN_DECIMAL_FMT.format(rawValue)} USD`;
  }
  if (
    unit === 'Bs.' ||
    col.endsWith('_bs') ||
    col.startsWith('cartera_') ||
    col.startsWith('prevision') ||
    col.startsWith('total_') ||
    col.startsWith('monto_') ||
    col.includes('activo') ||
    col.includes('pasivo') ||
    col.includes('patrimonio') ||
    col.includes('depositos') ||
    col.includes('utilidad')
  ) {
    return formatBolivianos(rawValue);
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
    col.includes('transformed_at') ||
    col.includes('fecha') ||
    col.includes('periodo') ||
    col.includes('moneda') ||
    col.includes('tipo_mercado') ||
    col.includes('subsector')
  ) {
    return false;
  }
  return (
    col === 'gestion' ||
    col === 'mes' ||
    col.startsWith('cartera_') ||
    col.startsWith('total_') ||
    col.startsWith('ratio_') ||
    col.startsWith('tasa_') ||
    col.startsWith('monto_') ||
    col.startsWith('numero_') ||
    col.includes('activo') ||
    col.includes('pasivo') ||
    col.includes('patrimonio') ||
    col.includes('prevision') ||
    col.includes('depositos') ||
    col.includes('utilidad') ||
    col.includes('mora') ||
    col.includes('roe') ||
    col.includes('roa') ||
    col.includes('liquidez') ||
    col.includes('solvencia') ||
    col.includes('ufv') ||
    col.includes('tipo_cambio') ||
    col.endsWith('_bs') ||
    col.endsWith('_usd') ||
    col.endsWith('_pct')
  );
}
