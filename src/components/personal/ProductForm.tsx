import { useMutation } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { SubmitButton } from "~/components/ui/buttons";
import { INPUT_CLASS, LABEL_CLASS } from "~/components/ui/tones";
import { api } from "../../../convex/_generated/api";

const COMMON_CATEGORIES = [
  "Alimentos y Despensa",
  "Lácteos y Huevos",
  "Carnes y Proteínas",
  "Frutas y Verduras",
  "Limpieza y Hogar",
  "Transporte y Servicios",
  "Bebidas",
  "Otros",
];

const COMMON_UNITS = [
  "kg",
  "L",
  "unidad",
  "maple",
  "arroba",
  "paquete",
  "docena",
  "lata",
];

interface ProductFormProps {
  onDone: () => void;
}

export function ProductForm({ onDone }: ProductFormProps) {
  const createProduct = useMutation(api.personal.products.create);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [unit, setUnit] = useState(COMMON_UNITS[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Escribe el nombre del producto.");
      return;
    }

    const finalCategory = customCategory.trim() || category;
    const finalUnit = customUnit.trim() || unit;

    setIsSaving(true);
    setError(null);

    try {
      await createProduct({
        name: name.trim(),
        category: finalCategory,
        unit: finalUnit,
      });
      onDone();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al guardar el producto.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <label htmlFor="product-name-input" className={LABEL_CLASS}>
          Nombre del Producto
        </label>
        <input
          id="product-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Queso Chaqueño, Café Molido, Manzanas..."
          className={INPUT_CLASS}
          // biome-ignore lint/a11y/noAutofocus: formulario abierto por intención de usuario
          autoFocus
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="product-category-select" className={LABEL_CLASS}>
            Categoría
          </label>
          <select
            id="product-category-select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              if (e.target.value !== "Otra...") setCustomCategory("");
            }}
            className={INPUT_CLASS}
          >
            {COMMON_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            <option value="Otra...">Otra categoría...</option>
          </select>
          {category === "Otra..." && (
            <input
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Escribe la categoría..."
              className={`${INPUT_CLASS} mt-2`}
            />
          )}
        </div>

        <div>
          <label htmlFor="product-unit-select" className={LABEL_CLASS}>
            Unidad de Medida
          </label>
          <select
            id="product-unit-select"
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              if (e.target.value !== "Otra...") setCustomUnit("");
            }}
            className={INPUT_CLASS}
          >
            {COMMON_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
            <option value="Otra...">Otra unidad...</option>
          </select>
          {unit === "Otra..." && (
            <input
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="Ej. caja, bolsa..."
              className={`${INPUT_CLASS} mt-2`}
            />
          )}
        </div>
      </div>

      {error && <p className="text-xs text-debt">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:text-ink transition-colors"
        >
          Cancelar
        </button>
        <SubmitButton isSaving={isSaving} label="Crear Producto" />
      </div>
    </form>
  );
}
