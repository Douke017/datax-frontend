import { Component, computed, inject, input, signal } from '@angular/core';
import { getInternoApiBase, toAbsoluteApiUrl } from '../../../core/config/api-endpoints';
import { ToastService } from '../../../core/services/toast.service';

export type SnippetLang = 'polars' | 'pandas' | 'duckdb' | 'r_arrow' | 'curl' | 'power_query';

@Component({
  selector: 'app-code-snippets-panel',
  standalone: true,
  imports: [],
  templateUrl: './code-snippets-panel.component.html',
  styleUrls: ['./code-snippets-panel.component.css']
})
export class CodeSnippetsPanelComponent {
  private readonly toast = inject(ToastService);

  readonly mode = input<'dataset' | 'raw-asset'>('dataset');
  readonly datasetName = input<string>('catalogo_series_files');
  readonly assetId = input<string>('');
  readonly parquetUrl = input<string>('');
  readonly csvUrl = input<string>('');
  readonly jsonlUrl = input<string>('');
  readonly rawDownloadUrl = input<string>('');
  readonly apiKey = input<string>('');

  readonly activeLang = signal<SnippetLang>('polars');

  readonly primaryTabs: Array<{ id: SnippetLang; label: string }> = [
    { id: 'polars', label: 'Python (Polars)' },
    { id: 'pandas', label: 'Python (Pandas)' },
    { id: 'duckdb', label: 'Python (DuckDB)' },
    { id: 'r_arrow', label: 'R (Arrow)' },
    { id: 'curl', label: 'cURL' }
  ];

  readonly resolvedKey = computed(() => this.apiKey().trim() || '<TU_API_KEY_DATAX>');

  readonly activeCode = computed(() => {
    const lang = this.activeLang();
    const key = this.resolvedKey();
    const internoBase = toAbsoluteApiUrl(getInternoApiBase());

    if (this.mode() === 'raw-asset') {
      const url = toAbsoluteApiUrl(
        this.rawDownloadUrl() || `${internoBase}/api/v1/catalog/assets/${this.assetId()}/download`
      );
      const aid = this.assetId() || 'asset_bruto';
      switch (lang) {
        case 'polars':
          return [
            'import hashlib, httpx, polars as pl',
            '',
            `url = "${url}"`,
            'resp = httpx.get(url, follow_redirects=True, timeout=60)',
            'resp.raise_for_status()',
            'expected_sha = resp.headers.get("X-Content-SHA256")',
            'assert hashlib.sha256(resp.content).hexdigest() == expected_sha',
            `with open("${aid}.bin", "wb") as f:`,
            '    f.write(resp.content)',
            'print("Archivo íntegro SHA-256:", expected_sha)'
          ].join('\n');
        case 'pandas':
          return [
            'import io, httpx, pandas as pd',
            '',
            `url = "${url}"`,
            'resp = httpx.get(url, timeout=60)',
            'resp.raise_for_status()',
            '# Ajustar según extensión original (.csv, .xlsx, .parquet)',
            'df = pd.read_csv(io.BytesIO(resp.content))',
            'print(df.head())'
          ].join('\n');
        case 'duckdb':
          return [
            'import duckdb',
            '',
            'con = duckdb.connect()',
            `# Descargar primero con curl -o ${aid}.parquet "${url}"`,
            `df = con.execute("SELECT * FROM '${aid}.parquet' LIMIT 20").df()`,
            'print(df)'
          ].join('\n');
        case 'r_arrow':
          return [
            'library(httr2)',
            '',
            `req <- request("${url}")`,
            'resp <- req_perform(req)',
            `writeBin(resp_body_raw(resp), "${aid}.bin")`,
            'cat("SHA-256:", resp_header(resp, "X-Content-SHA256"), "\\n")'
          ].join('\n');
        case 'curl':
          return [
            `curl -fSL -D - -o "${aid}.bin" \\`,
            `  "${url}"`
          ].join('\n');
        case 'power_query':
          return [
            'let',
            `    Binario = Web.Contents("${url}"),`,
            '    Contenido = Csv.Document(Binario, [Encoding=65001])',
            'in',
            '    Contenido'
          ].join('\n');
      }
    }

    const dm = this.datasetName() || 'catalogo_series_files';
    const pqUrl = toAbsoluteApiUrl(
      this.parquetUrl() || `${internoBase}/api/v1/analytics/export/parquet?datamart=${dm}`
    );
    const csvUrl = toAbsoluteApiUrl(
      this.csvUrl() || `${internoBase}/api/v1/analytics/export/csv?datamart=${dm}`
    );
    const jsonlUrl = toAbsoluteApiUrl(
      this.jsonlUrl() || `${internoBase}/api/v1/analytics/export/jsonl?datamart=${dm}`
    );
    const liveFeedPq = toAbsoluteApiUrl(`${internoBase}/api/v1/analytics/live-feed/${dm}?format=parquet`);

    switch (lang) {
      case 'polars':
        return [
          'import io, httpx, polars as pl',
          '',
          `url = "${liveFeedPq}"`,
          `headers = {"X-API-Key": "${key}"}`,
          'resp = httpx.get(url, headers=headers, timeout=60)',
          'resp.raise_for_status()',
          'df = pl.read_parquet(io.BytesIO(resp.content))',
          'print(df.shape, df.schema)'
        ].join('\n');
      case 'pandas':
        return [
          'import io, httpx, pandas as pd',
          '',
          `url = "${pqUrl}"`,
          `headers = {"X-API-Key": "${key}"}`,
          'resp = httpx.get(url, headers=headers, timeout=60)',
          'resp.raise_for_status()',
          'df = pd.read_parquet(io.BytesIO(resp.content))',
          'print(df.info())'
        ].join('\n');
      case 'duckdb':
        return [
          'import duckdb, httpx',
          '',
          `resp = httpx.get("${pqUrl}", headers={"X-API-Key": "${key}"}, timeout=60)`,
          'resp.raise_for_status()',
          `open("${dm}.parquet", "wb").write(resp.content)`,
          `rel = duckdb.sql("SELECT * FROM '${dm}.parquet' LIMIT 25")`,
          'rel.show()'
        ].join('\n');
      case 'r_arrow':
        return [
          'library(arrow)',
          'library(httr2)',
          '',
          `resp <- request("${liveFeedPq}") |>`,
          `  req_headers("X-API-Key" = "${key}") |>`,
          '  req_perform()',
          `df <- read_parquet(resp_body_raw(resp))`,
          'str(df)'
        ].join('\n');
      case 'curl':
        return [
          `# Descarga directa columnar Parquet (ZSTD)`,
          `curl -fSL -H "X-API-Key: ${key}" \\`,
          `  -o "${dm}.parquet" \\`,
          `  "${liveFeedPq}"`,
          '',
          `# Alternativa NDJSON / JSONL para streaming`,
          `curl -fSL -H "X-API-Key: ${key}" "${jsonlUrl}" | head -n 5`
        ].join('\n');
      case 'power_query':
        return [
          'let',
          `    Origen = Csv.Document(Web.Contents("${csvUrl}", [Headers=[#"X-API-Key"="${key}"]]), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.None]),`,
          '    Encabezados = Table.PromoteHeaders(Origen, [PromoteAllScalars=true])',
          'in',
          '    Encabezados'
        ].join('\n');
    }
  });

  selectLang(lang: SnippetLang): void {
    this.activeLang.set(lang);
  }

  copySnippet(): void {
    this.toast.copyToClipboard(this.activeCode(), 'Fragmento de código');
  }
}
