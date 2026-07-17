import { useMutation } from "convex/react";
import { useRef, useState } from "react";
import { LABEL_CLASS } from "~/components/ui/tones";
import {
  buildImportRows,
  CANONICAL_FIELDS,
  type ColumnMapping,
  chunk,
  guessColumnMapping,
  type ParsedSheet,
  parseWorkbook,
} from "~/lib/inventario/excel";
import { api } from "../../../convex/_generated/api";

// Debe ser <= convex/inventario/importRows.ts:MAX_ROWS_PER_IMPORT (límite de
// una transacción de Convex).
const IMPORT_BATCH_SIZE = 300;
const PREVIEW_ROWS = 5;

type ImportSummary = {
  itemsCreated: number;
  itemsUpdated: number;
  modelsCreated: number;
  compatibilityLinksCreated: number;
  errors: { row: number; message: string }[];
};

const EMPTY_SUMMARY: ImportSummary = {
  itemsCreated: 0,
  itemsUpdated: 0,
  modelsCreated: 0,
  compatibilityLinksCreated: 0,
  errors: [],
};

export function ExcelImportPanel() {
  const importRows = useMutation(api.inventario.importRows.importRows);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "importing" | "done">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<ImportSummary>(EMPTY_SUMMARY);

  const reset = () => {
    setSheet(null);
    setMapping(null);
    setFileError(null);
    setStatus("idle");
    setSummary(EMPTY_SUMMARY);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFile = async (file: File) => {
    setFileError(null);
    setStatus("idle");
    setSummary(EMPTY_SUMMARY);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseWorkbook(buffer);
      if (parsed.rows.length === 0) {
        setFileError("El archivo no tiene filas de datos");
        setSheet(null);
        setMapping(null);
        return;
      }
      setSheet(parsed);
      setMapping(guessColumnMapping(parsed.headers));
    } catch {
      setFileError("No se pudo leer el archivo. ¿Es un Excel o CSV válido?");
      setSheet(null);
      setMapping(null);
    }
  };

  const handleImport = async () => {
    if (sheet === null || mapping === null) {
      return;
    }
    const rows = buildImportRows(sheet.rows, mapping);
    if (rows.length === 0) {
      setFileError(
        "Ninguna fila tiene código o nombre; revisa el mapeo de columnas",
      );
      return;
    }

    const batches = chunk(rows, IMPORT_BATCH_SIZE);
    setStatus("importing");
    setProgress({ done: 0, total: batches.length });

    const aggregated: ImportSummary = {
      itemsCreated: 0,
      itemsUpdated: 0,
      modelsCreated: 0,
      compatibilityLinksCreated: 0,
      errors: [],
    };
    let rowOffset = 0;

    try {
      for (const batch of batches) {
        const result = await importRows({ rows: batch });
        aggregated.itemsCreated += result.itemsCreated;
        aggregated.itemsUpdated += result.itemsUpdated;
        aggregated.modelsCreated += result.modelsCreated;
        aggregated.compatibilityLinksCreated +=
          result.compatibilityLinksCreated;
        for (const err of result.errors) {
          aggregated.errors.push({
            row: err.row + rowOffset,
            message: err.message,
          });
        }
        rowOffset += batch.length;
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      setSummary(aggregated);
      setStatus("done");
    } catch {
      setFileError(
        "La importación se interrumpió. Los lotes ya aplicados quedaron guardados.",
      );
      setSummary(aggregated);
      setStatus("done");
    }
  };

  const preview =
    sheet !== null && mapping !== null
      ? buildImportRows(sheet.rows.slice(0, PREVIEW_ROWS), mapping)
      : [];
  const canImport =
    mapping !== null && mapping.sku !== null && mapping.name !== null;

  return (
    <section className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Inventario
        </p>
        <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
          Importar desde Excel
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Sube la planilla que ya manejas. Detectamos las columnas
          automáticamente; puedes corregirlas antes de importar.
        </p>
      </header>

      <div className="mt-5">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          aria-label="Seleccionar archivo Excel o CSV"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-paper file:px-3 file:py-1.5 file:text-sm file:font-semibold hover:file:border-ink/30"
        />
        {fileError ? (
          <p className="mt-2 text-xs text-debt">{fileError}</p>
        ) : null}
      </div>

      {sheet !== null && mapping !== null && status !== "importing" ? (
        <div className="mt-5 grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {CANONICAL_FIELDS.map((field) => (
              <div key={field.key}>
                <label htmlFor={`inv-map-${field.key}`} className={LABEL_CLASS}>
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                <select
                  id={`inv-map-${field.key}`}
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) =>
                      prev
                        ? {
                            ...prev,
                            [field.key]:
                              e.target.value.length > 0 ? e.target.value : null,
                          }
                        : prev,
                    )
                  }
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-ink/40 focus:outline-none"
                >
                  <option value="">— No usar —</option>
                  {sheet.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {preview.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper/60 text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-3 py-2">Código</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Precio (¢)</th>
                    <th className="px-3 py-2">Modelos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {preview.map((row, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: vista previa estática de las primeras filas del archivo subido; el orden nunca cambia y sku/name pueden repetirse o venir vacíos.
                    <tr key={`preview-row-${i}`}>
                      <td className="px-3 py-2">{row.sku || "—"}</td>
                      <td className="px-3 py-2">{row.name || "—"}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.stock ?? "0 (por defecto)"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {row.priceCents ?? "—"}
                      </td>
                      <td className="px-3 py-2">{row.modelsRaw || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-line px-3 py-2 text-xs text-ink-soft">
                Vista previa de {preview.length} de {sheet.rows.length} filas
              </p>
            </div>
          ) : null}

          {!canImport ? (
            <p className="text-xs text-debt">
              Asigna al menos Código y Nombre para poder importar
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-ink/30"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canImport}
              onClick={() => void handleImport()}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition-all duration-150 hover:opacity-85 disabled:opacity-50"
            >
              Importar {sheet.rows.length} fila
              {sheet.rows.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      ) : null}

      {status === "importing" ? (
        <p className="mt-5 text-sm text-ink-soft">
          Importando lote {progress.done + 1} de {progress.total}…
        </p>
      ) : null}

      {status === "done" ? (
        <div className="mt-5 grid gap-3 rounded-xl border border-line bg-paper/60 p-4">
          <p className="text-sm font-medium">
            {summary.itemsCreated} repuestos nuevos · {summary.itemsUpdated}{" "}
            actualizados · {summary.modelsCreated} modelos nuevos ·{" "}
            {summary.compatibilityLinksCreated} compatibilidades registradas
          </p>
          {summary.errors.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-debt">
                {summary.errors.length} fila
                {summary.errors.length === 1 ? "" : "s"} con problemas (se
                saltaron, el resto se importó):
              </p>
              <ul className="mt-1 max-h-40 overflow-y-auto text-xs text-ink-soft">
                {summary.errors.map((err) => (
                  <li key={err.row}>
                    Fila {err.row}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="justify-self-start rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-ink/30"
          >
            Importar otro archivo
          </button>
        </div>
      ) : null}
    </section>
  );
}
