import { getStore } from "@edgeone/pages-blob";

const STORE_NAME = "navdesk-data";
const DATA_KEY = "navigation/data.json";

export function getNavigationStore() { return getStore(STORE_NAME); }

export async function getNavigation(store) {
  const data = await store.get(DATA_KEY, { type: "json", consistency: "strong" });
  return data && typeof data === "object" ? data : { version: 1, updatedAt: null, groups: [] };
}

export async function saveNavigation(store, data) { await store.setJSON(DATA_KEY, data); }
