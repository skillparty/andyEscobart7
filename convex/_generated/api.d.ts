/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as auth from "../auth.js";
import type * as compras_purchases from "../compras/purchases.js";
import type * as compras_suppliers from "../compras/suppliers.js";
import type * as http from "../http.js";
import type * as inventario_carModels from "../inventario/carModels.js";
import type * as inventario_compatibility from "../inventario/compatibility.js";
import type * as inventario_importRows from "../inventario/importRows.js";
import type * as inventario_items from "../inventario/items.js";
import type * as inventario_lib from "../inventario/lib.js";
import type * as inventario_search from "../inventario/search.js";
import type * as kardex_lib from "../kardex/lib.js";
import type * as kardex_movements from "../kardex/movements.js";
import type * as kardex_valuation from "../kardex/valuation.js";
import type * as migrations from "../migrations.js";
import type * as money from "../money.js";
import type * as payables from "../payables.js";
import type * as receivables from "../receivables.js";
import type * as storage from "../storage.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";
import type * as ventas_sales from "../ventas/sales.js";
import type * as voiceAI from "../voiceAI.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  auth: typeof auth;
  "compras/purchases": typeof compras_purchases;
  "compras/suppliers": typeof compras_suppliers;
  http: typeof http;
  "inventario/carModels": typeof inventario_carModels;
  "inventario/compatibility": typeof inventario_compatibility;
  "inventario/importRows": typeof inventario_importRows;
  "inventario/items": typeof inventario_items;
  "inventario/lib": typeof inventario_lib;
  "inventario/search": typeof inventario_search;
  "kardex/lib": typeof kardex_lib;
  "kardex/movements": typeof kardex_movements;
  "kardex/valuation": typeof kardex_valuation;
  migrations: typeof migrations;
  money: typeof money;
  payables: typeof payables;
  receivables: typeof receivables;
  storage: typeof storage;
  transactions: typeof transactions;
  users: typeof users;
  "ventas/sales": typeof ventas_sales;
  voiceAI: typeof voiceAI;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
