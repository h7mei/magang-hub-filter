import { buildStaticDataset, type StaticDataset, type StaticListingsPayload } from "@/lib/listings-engine";
import type { MetaResponse } from "@/types";

const META_URL = "/data/meta.json";
const LISTINGS_URL = "/data/listings.json";

let datasetPromise: Promise<StaticDataset> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load static data: ${url}`);
  }
  return response.json() as Promise<T>;
}

export async function loadStaticDataset(): Promise<StaticDataset> {
  if (!datasetPromise) {
    datasetPromise = Promise.all([
      fetchJson<MetaResponse>(META_URL),
      fetchJson<StaticListingsPayload>(LISTINGS_URL),
    ]).then(([meta, listings]) => buildStaticDataset(meta, listings));
  }
  return datasetPromise;
}

export function resetStaticDatasetCache(): void {
  datasetPromise = null;
}
