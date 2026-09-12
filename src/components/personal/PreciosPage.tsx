import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Header } from "~/components/ui/Header";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PriceForm } from "./PriceForm";
import { PriceHistoryModal } from "./PriceHistoryModal";
import { ProductForm } from "./ProductForm";
import { ShoppingListSection } from "./ShoppingListSection";
import { StoreComparisonModal } from "./StoreComparisonModal";

const TONE_BADGES = {
  good_time: "bg-positive-soft text-positive border-positive/30",
  expensive: "bg-debt-soft text-debt border-debt/30",
  stable: "bg-line/40 text-ink-soft border-line",
  insufficient_data: "bg-paper text-ink-soft border-dashed border-line",
} as const;

export function PreciosPage() {
  const products = useQuery(api.personal.products.list);
  const analyses = useQuery(api.personal.prices.getAnalysis, {});
  const seedPreloaded = useMutation(api.personal.products.seedPreloaded);
  const removeProduct = useMutation(api.personal.products.remove);
  const addToShoppingList = useMutation(api.personal.shoppingList.add);

  const [activeTab, setActiveTab] = useState<"catalog" | "shopping_list">(
    "catalog",
  );
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<
    Id<"personalProducts"> | undefined
  >();
  const [viewingHistoryProduct, setViewingHistoryProduct] = useState<{
    id: Id<"personalProducts">;
    name: string;
    unit: string;
  } | null>(null);
  const [viewingStoresProduct, setViewingStoresProduct] = useState<{
    id: Id<"personalProducts">;
    name: string;
    unit: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isSeeding, setIsSeeding] = useState(false);

  // Categorías disponibles
  const categories = useMemo(() => {
    if (!products) return [];
    const set = new Set(products.map((p) => p.category));
    return Array.from(set).sort();
  }, [products]);

  // Análisis mapeados por productId
  type AnalysisItem = NonNullable<typeof analyses>[number];
  const analysisMap = useMemo(() => {
    const map = new Map<string, AnalysisItem>();
    for (const a of analyses ?? []) {
      map.set(a.productId, a);
    }
    return map;
  }, [analyses]);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === "all" || p.category === selectedCategory;

      const analysis = analysisMap.get(p._id);
      const matchesStatus =
        selectedStatus === "all" ||
        analysis?.recommendation.status === selectedStatus;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus, analysisMap]);

  // Contadores para métricas superiores
  const kpiData = useMemo(() => {
    let goodTimeCount = 0;
    let expensiveCount = 0;
    for (const a of analyses ?? []) {
      if (a.recommendation.status === "good_time") goodTimeCount++;
      if (a.recommendation.status === "expensive") expensiveCount++;
    }
    return {
      total: products?.length ?? 0,
      goodTimeCount,
      expensiveCount,
    };
  }, [products, analyses]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedPreloaded({});
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDeleteProduct = async (
    id: Id<"personalProducts">,
    name: string,
  ) => {
    if (!confirm(`¿Estás seguro de archivar "${name}"?`)) return;
    await removeProduct({ id });
  };

  const handleQuickAddToList = async (
    productId: Id<"personalProducts">,
    name: string,
  ) => {
    await addToShoppingList({ productId, targetQuantity: 1 });
    setToastMessage(`"${name}" agregado a tu lista del mercado.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openPriceFormFor = (productId?: Id<"personalProducts">) => {
    setSelectedProductId(productId);
    setIsPriceModalOpen(true);
  };

  return (
    <div className="min-h-dvh bg-paper">
      <Header title="Canasta & Precios" />

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-6 sm:pt-8 space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-ink text-paper px-4 py-3 text-xs font-semibold shadow-xl animate-card-enter flex items-center gap-2">
            <span>✓</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Banner de Bienvenida y Explicación Estacional */}
        <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-2 rounded-full bg-positive" />
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Inteligencia de Precios & Estacionalidad
                </p>
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                ¿Cuándo conviene comprar?
              </h2>
              <p className="max-w-2xl text-xs sm:text-sm text-ink-soft">
                Registra los productos que compras y sus precios para comparar
                contra promedios históricos y temporadas climáticas. Planifica
                tu lista de compras inteligente.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openPriceFormFor()}
                disabled={!products || products.length === 0}
                className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs sm:text-sm font-semibold text-paper shadow-sm transition hover:bg-ink/90 disabled:opacity-50"
              >
                <span>＋</span> Registrar Compra / Precio
              </button>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-xs sm:text-sm font-semibold text-ink transition hover:border-ink/40"
              >
                <span>＋</span> Nuevo Producto
              </button>
            </div>
          </div>

          {/* Tarjetas KPI */}
          <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-paper/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Productos Monitoreados
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">
                {kpiData.total}
              </p>
              <p className="mt-1 text-[11px] text-ink-soft">
                En tu canasta personal
              </p>
            </div>

            <div className="rounded-xl border border-positive/30 bg-positive-soft/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-positive">
                Oportunidades de Compra
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-positive">
                {kpiData.goodTimeCount}
              </p>
              <p className="mt-1 text-[11px] text-positive/80">
                Precios por debajo del promedio estacional
              </p>
            </div>

            <div className="rounded-xl border border-debt/30 bg-debt-soft/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-debt">
                Precios en Alza / Esperar
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-debt">
                {kpiData.expensiveCount}
              </p>
              <p className="mt-1 text-[11px] text-debt/80">
                Conviene comprar solo lo indispensable
              </p>
            </div>
          </div>
        </div>

        {/* Selector de Pestañas: Canasta vs Lista del Mercado */}
        <div className="flex items-center gap-2 border-b border-line pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
              activeTab === "catalog"
                ? "bg-ink text-paper shadow-xs"
                : "text-ink-soft hover:text-ink hover:bg-line/20"
            }`}
          >
            <span>🏷️</span> Canasta & Sugerencias ({products?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shopping_list")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
              activeTab === "shopping_list"
                ? "bg-ink text-paper shadow-xs"
                : "text-ink-soft hover:text-ink hover:bg-line/20"
            }`}
          >
            <span>🛒</span> Lista Inteligente del Mercado
          </button>
        </div>

        {/* VISTA 1: Catálogo de Productos y Sugerencias */}
        {activeTab === "catalog" && (
          <div className="space-y-6 animate-card-enter">
            {/* Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar producto o categoría…"
                  className="w-full rounded-xl border border-line bg-card px-4 py-2 text-xs sm:text-sm text-ink placeholder:text-ink-soft/60 focus:border-ink/40 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-xs text-ink-soft hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex w-full sm:w-auto items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-xl border border-line bg-card px-3 py-2 text-xs text-ink focus:border-ink/40 focus:outline-none"
                >
                  <option value="all">Todas las Categorías</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-xl border border-line bg-card px-3 py-2 text-xs text-ink focus:border-ink/40 focus:outline-none"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="good_time">🟢 Buen Momento</option>
                  <option value="stable">⚪ Precio Estable</option>
                  <option value="expensive">🔴 Precio Alto</option>
                  <option value="insufficient_data">⏳ Sin Datos</option>
                </select>
              </div>
            </div>

            {/* Estado Vacío cuando no hay productos */}
            {products !== undefined && products.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line bg-card p-12 text-center space-y-4">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-line/30 text-2xl">
                  🧺
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-lg font-bold text-ink">
                    Tu canasta de productos está vacía
                  </h3>
                  <p className="mx-auto max-w-md text-xs sm:text-sm text-ink-soft">
                    Puedes comenzar precargando los productos habituales de la
                    canasta boliviana o crear tus propios artículos
                    personalizados.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSeed}
                    disabled={isSeeding}
                    className="rounded-xl bg-ink px-5 py-2.5 text-xs sm:text-sm font-semibold text-paper shadow-sm hover:bg-ink/90 transition disabled:opacity-50"
                  >
                    {isSeeding ? "Cargando…" : "Cargar Canasta Básica Sugerida"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(true)}
                    className="rounded-xl border border-line bg-paper px-5 py-2.5 text-xs sm:text-sm font-semibold text-ink hover:border-ink/40 transition"
                  >
                    Crear Producto Personalizado
                  </button>
                </div>
              </div>
            )}

            {/* Grid de Productos con Recomendaciones */}
            {products !== undefined &&
              products.length > 0 &&
              (filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-line bg-card p-10 text-center text-sm text-ink-soft">
                  No se encontraron productos con los filtros seleccionados.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts.map((product) => {
                    const analysis = analysisMap.get(product._id);
                    const statusKey = (analysis?.recommendation.status ??
                      "insufficient_data") as keyof typeof TONE_BADGES;
                    const badgeClass = TONE_BADGES[statusKey];

                    return (
                      <div
                        key={product._id}
                        className="group relative flex flex-col justify-between rounded-2xl border border-line bg-card p-5 transition-shadow hover:shadow-md"
                      >
                        {/* Cabecera de la tarjeta */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="rounded-md border border-line bg-line/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-soft">
                              {product.category}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteProduct(product._id, product.name)
                              }
                              title="Archivar producto"
                              className="text-ink-soft/40 hover:text-debt transition-colors text-xs"
                            >
                              ✕
                            </button>
                          </div>

                          <div>
                            <h4 className="font-display text-lg font-semibold text-ink leading-snug">
                              {product.name}
                            </h4>
                            <p className="text-xs text-ink-soft">
                              Unidad: {product.unit}
                            </p>
                          </div>

                          {/* Precio Actual */}
                          <div className="rounded-xl bg-paper/60 p-3 border border-line">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[11px] font-medium text-ink-soft">
                                Último precio:
                              </span>
                              <div className="text-right">
                                <span className="font-display text-xl font-bold text-ink">
                                  {analysis?.latestPrice !== null &&
                                  analysis?.latestPrice !== undefined
                                    ? formatMoney(analysis.latestPrice)
                                    : "Sin precio"}
                                </span>
                                {analysis?.trendVsPrevPercent !== null &&
                                  analysis?.trendVsPrevPercent !==
                                    undefined && (
                                    <span
                                      className={`ml-1.5 text-xs font-semibold ${
                                        analysis.trendVsPrevPercent < 0
                                          ? "text-positive"
                                          : analysis.trendVsPrevPercent > 0
                                            ? "text-debt"
                                            : "text-ink-soft"
                                      }`}
                                    >
                                      {analysis.trendVsPrevPercent < 0
                                        ? "↓"
                                        : "↑"}{" "}
                                      {Math.abs(analysis.trendVsPrevPercent)}%
                                    </span>
                                  )}
                              </div>
                            </div>

                            {/* Estadísticas de mínimos, máximos y promedio */}
                            {analysis && analysis.recordsCount > 1 && (
                              <div className="mt-2.5 pt-2 border-t border-line/60 grid grid-cols-3 gap-1 text-center text-[10px] text-ink-soft">
                                <div>
                                  <span className="block text-[9px] uppercase">
                                    Mín
                                  </span>
                                  <span className="font-medium text-ink">
                                    {analysis.minPrice !== null
                                      ? formatMoney(analysis.minPrice)
                                      : "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[9px] uppercase">
                                    Promedio
                                  </span>
                                  <span className="font-medium text-ink">
                                    {analysis.avgPrice !== null
                                      ? formatMoney(analysis.avgPrice)
                                      : "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[9px] uppercase">
                                    Máx
                                  </span>
                                  <span className="font-medium text-ink">
                                    {analysis.maxPrice !== null
                                      ? formatMoney(analysis.maxPrice)
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Recomendación Inteligente */}
                          <div
                            className={`rounded-xl border p-3 ${badgeClass} space-y-1`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">
                                {analysis?.recommendation.status === "good_time"
                                  ? "🟢"
                                  : analysis?.recommendation.status ===
                                      "expensive"
                                    ? "🔴"
                                    : analysis?.recommendation.status ===
                                        "stable"
                                      ? "⚪"
                                      : "⏳"}
                              </span>
                              <span className="text-xs font-bold">
                                {analysis?.recommendation.badge ?? "Sin datos"}
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed opacity-90">
                              {analysis?.recommendation.advice}
                            </p>
                          </div>
                        </div>

                        {/* Botones de acción de la tarjeta */}
                        <div className="mt-4 pt-3 border-t border-line space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openPriceFormFor(product._id)}
                              className="flex-1 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper hover:bg-ink/90 transition text-center"
                            >
                              ＋ Registrar Precio
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleQuickAddToList(product._id, product.name)
                              }
                              className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-ink/40 transition"
                              title="Añadir a la lista inteligente del mercado"
                            >
                              🛒 ＋ Lista
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setViewingStoresProduct({
                                  id: product._id,
                                  name: product.name,
                                  unit: product.unit,
                                })
                              }
                              className="flex-1 rounded-lg border border-line bg-card px-2 py-1 text-[11px] font-medium text-ink-soft hover:text-ink hover:border-ink/40 transition text-center"
                            >
                              🏪 Dónde comprar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setViewingHistoryProduct({
                                  id: product._id,
                                  name: product.name,
                                  unit: product.unit,
                                })
                              }
                              className="flex-1 rounded-lg border border-line bg-card px-2 py-1 text-[11px] font-medium text-ink-soft hover:text-ink hover:border-ink/40 transition text-center"
                            >
                              📈 Gráfico
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        )}

        {/* VISTA 2: Lista Inteligente del Mercado */}
        {activeTab === "shopping_list" && (
          <div className="animate-card-enter">
            <ShoppingListSection
              products={products ?? []}
              onOpenPriceForm={openPriceFormFor}
            />
          </div>
        )}
      </main>

      {/* Modal Registrar Precio */}
      {isPriceModalOpen && products && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setIsPriceModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-line bg-card p-6 shadow-2xl animate-card-enter">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <h3 className="font-display text-lg font-bold text-ink">
                Registrar Precio de Compra
              </h3>
              <button
                type="button"
                onClick={() => setIsPriceModalOpen(false)}
                className="grid size-7 place-items-center rounded-lg border border-line text-ink-soft hover:text-ink"
              >
                ✕
              </button>
            </div>
            <PriceForm
              initialProductId={selectedProductId}
              products={products}
              onDone={() => setIsPriceModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modal Crear Nuevo Producto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setIsProductModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl animate-card-enter">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <h3 className="font-display text-lg font-bold text-ink">
                Nuevo Producto para la Canasta
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="grid size-7 place-items-center rounded-lg border border-line text-ink-soft hover:text-ink"
              >
                ✕
              </button>
            </div>
            <ProductForm onDone={() => setIsProductModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Modal Gráfico de Evolución de Precios */}
      {viewingHistoryProduct && (
        <PriceHistoryModal
          productId={viewingHistoryProduct.id}
          productName={viewingHistoryProduct.name}
          unit={viewingHistoryProduct.unit}
          onClose={() => setViewingHistoryProduct(null)}
        />
      )}

      {/* Modal Comparativa por Tiendas */}
      {viewingStoresProduct && (
        <StoreComparisonModal
          productId={viewingStoresProduct.id}
          productName={viewingStoresProduct.name}
          unit={viewingStoresProduct.unit}
          onClose={() => setViewingStoresProduct(null)}
        />
      )}
    </div>
  );
}
