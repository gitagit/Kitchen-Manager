import { z } from "zod";
import { normName } from "@/lib/normalize";

// Valid values (SQLite doesn't support enums, so we validate in code)
export const ItemCategories = ["PANTRY", "SPICE", "FROZEN", "PRODUCE", "MEAT", "DAIRY", "CONDIMENT", "BAKING", "BEVERAGE", "OTHER"] as const;
export const ItemLocations = ["PANTRY", "FRIDGE", "FREEZER", "COUNTER", "OTHER"] as const;
export const GroceryChannels = ["SHIP", "IN_PERSON", "EITHER"] as const;
export const RecipeSources = ["PERSONAL", "FAMILY", "WEB", "COOKBOOK", "FRIEND"] as const;
export const Complexities = ["FAMILIAR", "STRETCH", "CHALLENGE"] as const;
export const EquipmentOptions = [
  "OVEN", "STOVETOP", "INSTANT_POT", "AIR_FRYER", "GRILL",
  "MICROWAVE", "SLOW_COOKER", "FOOD_PROCESSOR", "STAND_MIXER",
  "BLENDER", "TOASTER_OVEN"
] as const;

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

export const UserPreferencesSchema = z.object({
  equipment: z.array(z.string()).optional(),
  defaultServings: z.number().int().positive().optional(),
  defaultMaxTimeMin: z.number().int().positive().optional(),
  dietaryTagsExclude: z.array(z.string()).optional(),
  cuisinesExclude: z.array(z.string()).optional(),
  defaultComplexity: z.enum(["FAMILIAR", "STRETCH", "CHALLENGE", "ANY"]).optional(),
  wantVariety: z.boolean().optional(),
  wantGrowth: z.boolean().optional(),
});

export function cleanName(name: string): string {
  return normName(name);
}
