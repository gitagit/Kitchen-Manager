/**
 * Quantity parsing and arithmetic for inventory tracking.
 * Handles free-form strings like "2 cups", "1/4 tsp", "500g", "1 1/2 lbs", "3 eggs".
 */

// Base unit: grams
const WEIGHT: Record<string, number> = {
  g: 1, gram: 1, grams: 1,
  kg: 1000, kilogram: 1000, kilograms: 1000,
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
};

// Base unit: ml
const VOLUME: Record<string, number> = {
  ml: 1, milliliter: 1, milliliters: 1,
  l: 1000, liter: 1000, liters: 1000,
  tsp: 4.929, teaspoon: 4.929, teaspoons: 4.929,
  tbsp: 14.787, tablespoon: 14.787, tablespoons: 14.787,
  "fl oz": 29.574,
  cup: 236.588, cups: 236.588,
  pint: 473.176, pints: 473.176,
  quart: 946.353, quarts: 946.353,
  gallon: 3785.41, gallons: 3785.41,
};

// Count units (base: 1 each)
const COUNT = new Set([
  "each", "piece", "pieces", "whole",
  "clove", "cloves", "head", "heads",
  "egg", "eggs",
  "slice", "slices",
  "can", "cans", "jar", "jars", "bottle", "bottles",
  "bag", "bags", "bunch", "bunches",
  "stalk", "stalks", "sprig", "sprigs",
  "sheet", "sheets",
]);

export type ParsedQty = {
  value: number;
  unit: string;
  group: "weight" | "volume" | "count" | "unknown";
  baseValue: number;
};

/**
 * Parses a quantity string into a structured value.
 * Returns null if no numeric value can be extracted.
 */
export function parseQty(s: string): ParsedQty | null {
  if (!s?.trim()) return null;
  const str = s.trim().toLowerCase();

  // Match leading number: "1 1/2", "1/4", "2.5", "3"
  const numMatch = str.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)/);
  if (!numMatch) return null;

  const rawNum = numMatch[1].trim();
  let value: number;

  if (rawNum.includes(" ")) {
    // Mixed number: "1 1/2"
    const parts = rawNum.split(/\s+/);
    const [n, d] = parts[1].split("/");
    value = parseInt(parts[0]) + parseInt(n) / parseInt(d);
  } else if (rawNum.includes("/")) {
    const [n, d] = rawNum.split("/");
    value = parseInt(n) / parseInt(d);
  } else {
    value = parseFloat(rawNum);
  }

  if (isNaN(value)) return null;

  const rest = str.slice(numMatch[0].length).trim();
  const unit = rest.split(/[\s,]+/)[0] ?? "";

  if (WEIGHT[unit] !== undefined) {
    return { value, unit, group: "weight", baseValue: value * WEIGHT[unit] };
  }
  if (VOLUME[unit] !== undefined) {
    return { value, unit, group: "volume", baseValue: value * VOLUME[unit] };
  }
  if (COUNT.has(unit) || unit === "") {
    return { value, unit, group: "count", baseValue: value };
  }
  // Unknown unit — still return a value so caller can decide
  return { value, unit, group: "unknown", baseValue: value };
}

function formatValue(v: number): string {
  // Round to 2 decimal places, strip trailing zeros
  const rounded = Math.round(v * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : String(rounded);
}

/**
 * Subtracts recipe usage from a batch quantity, scaled by a serving multiplier.
 *
 * Returns:
 * - A formatted remaining quantity string (e.g. "3.5 lbs", "300g")
 * - "0" if the batch would be fully depleted
 * - null if units are incompatible or can't be parsed
 */
export function subtractQty(
  batchQty: string,
  recipeQty: string,
  scaleFactor: number = 1
): string | null {
  const batch = parseQty(batchQty);
  const recipe = parseQty(recipeQty);

  if (!batch || !recipe) return null;
  if (batch.group === "unknown" || recipe.group === "unknown") return null;
  if (batch.group !== recipe.group) return null;

  const used = recipe.baseValue * scaleFactor;
  const remaining = batch.baseValue - used;

  if (remaining <= 0) return "0";

  // Convert back to original batch unit
  let factor: number;
  if (batch.group === "weight") {
    factor = WEIGHT[batch.unit];
  } else if (batch.group === "volume") {
    factor = VOLUME[batch.unit];
  } else {
    // count
    const result = remaining;
    const formatted = formatValue(result);
    return batch.unit ? `${formatted} ${batch.unit}` : formatted;
  }

  if (!factor) return null;

  const resultValue = remaining / factor;
  const formatted = formatValue(resultValue);
  return batch.unit ? `${formatted} ${batch.unit}` : formatted;
}
