import AsyncStorage from "@react-native-async-storage/async-storage";

const GROCERY_CACHE_KEY = "mise_grocery_cache";
const GROCERY_PENDING_KEY = "mise_grocery_pending";

type CachedGroceryList = {
  items: Record<string, unknown>[];
  cachedAt: number;
};

type PendingToggle = {
  itemId: string;
  acquired: boolean;
  timestamp: number;
};

/** Save grocery list to local cache. */
export async function cacheGroceryList(items: Record<string, unknown>[]): Promise<void> {
  const data: CachedGroceryList = { items, cachedAt: Date.now() };
  await AsyncStorage.setItem(GROCERY_CACHE_KEY, JSON.stringify(data));
}

/** Load grocery list from local cache. Returns null if no cache. */
export async function getCachedGroceryList(): Promise<CachedGroceryList | null> {
  const raw = await AsyncStorage.getItem(GROCERY_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedGroceryList;
  } catch {
    return null;
  }
}

/** Queue a toggle action for sync when back online. */
export async function queueToggle(itemId: string, acquired: boolean): Promise<void> {
  const raw = await AsyncStorage.getItem(GROCERY_PENDING_KEY);
  const pending: PendingToggle[] = raw ? JSON.parse(raw) : [];
  // Replace existing toggle for same item
  const filtered = pending.filter(p => p.itemId !== itemId);
  filtered.push({ itemId, acquired, timestamp: Date.now() });
  await AsyncStorage.setItem(GROCERY_PENDING_KEY, JSON.stringify(filtered));
}

/** Get all pending toggles. */
export async function getPendingToggles(): Promise<PendingToggle[]> {
  const raw = await AsyncStorage.getItem(GROCERY_PENDING_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingToggle[];
  } catch {
    return [];
  }
}

/** Clear pending toggles after successful sync. */
export async function clearPendingToggles(): Promise<void> {
  await AsyncStorage.removeItem(GROCERY_PENDING_KEY);
}
