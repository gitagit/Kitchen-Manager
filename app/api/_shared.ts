import { z } from "zod";
import { normName } from "@/lib/normalize";

// Valid values (SQLite doesn't support enums, so we validate in code)
export const ItemCategories = ["PANTRY", "SPICE", "FROZEN", "PRODUCE", "MEAT", "DAIRY", "CONDIMENT", "BAKING", "BEVERAGE", "OTHER"] as const;
export const ItemLocations = ["PANTRY", "FRIDGE", "FREEZER", "COUNTER", "OTHER"] as const;
export const GroceryChannels = ["SHIP", "IN_PERSON", "EITHER"] as const;
export const RecipeSources = ["PERSONAL", "FAMILY", "WEB", "COOKBOOK", "FRIEND"] as const;
export const Complexities = ["FAMILIAR", "STRETCH", "CHALLENGE"] as const;

export const ItemCategorySchema = z.enum(ItemCategories);
export const ItemLocationSchema = z.enum(ItemLocations);
export const GroceryChannelSchema = z.enum(GroceryChannels);

export const CreateItemSchema = z.object({
  name: z.string().min(1),
  category: ItemCategorySchema,
  location: ItemLocationSchema,
  staple: z.boolean().optional(),
  parLevel: z.number().int().positive().optional(),
  defaultCostCents: z.number().int().nonnegative().optional()
});

export const CreateBatchSchema = z.object({
  itemId: z.string().min(1),
  quantityText: z.string().min(1),
  expiresOn: z.string().datetime().optional(),
  purchasedOn: z.string().datetime().optional(),
  costCents: z.number().int().nonnegative().optional()
});

export function cleanName(name: string): string {
  return normName(name);
}
