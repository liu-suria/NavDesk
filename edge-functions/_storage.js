import { getStore } from "@edgeone/pages-blob";

const STORE_NAME = "navdesk-data";
const DATA_KEY = "navigation/data.json";

export function getNavigationStore() { return getStore(STORE_NAME); }

export {readNavigation as getNavigation} from './_navigation-read.js';

export async function saveNavigation(store, data) { await store.setJSON(DATA_KEY, data); }
