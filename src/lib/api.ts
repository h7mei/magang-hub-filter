import {
  buildMapPoints,
  filterRecords,
  queryCompanyListings,
  queryListings,
  queryMapCompanies,
  exportFilteredRecords,
} from "@/lib/listings-engine";
import { loadStaticDataset } from "@/lib/static-data";
import type {
  CompanyListingsResponse,
  FilterState,
  ListingRecord,
  ListingsResponse,
  MapCompaniesResponse,
  MapPointsResponse,
  MetaResponse,
} from "@/types";

export async function fetchMeta(): Promise<MetaResponse> {
  const dataset = await loadStaticDataset();
  return dataset.meta;
}

export async function fetchListings(filters: FilterState): Promise<ListingsResponse> {
  const dataset = await loadStaticDataset();
  return queryListings(dataset.records, filters);
}

export async function fetchMapCompanies(filters?: FilterState): Promise<MapCompaniesResponse> {
  const dataset = await loadStaticDataset();
  return queryMapCompanies(dataset.records, filters ?? defaultEmptyFilters());
}

export async function fetchCompanyListings(
  company: string,
  scope?: { location?: string; latitude?: number; longitude?: number },
  filters?: FilterState,
): Promise<CompanyListingsResponse> {
  const dataset = await loadStaticDataset();
  return queryCompanyListings(dataset.records, company, scope, filters ?? defaultEmptyFilters());
}

export async function fetchMapPoints(filters?: FilterState): Promise<MapPointsResponse> {
  const dataset = await loadStaticDataset();
  return buildMapPoints(filterRecords(dataset.records, filters ?? defaultEmptyFilters()));
}

export async function fetchListingById(id: string): Promise<ListingRecord> {
  const dataset = await loadStaticDataset();
  const record = dataset.recordsById.get(id);
  if (!record) {
    throw new Error("Listing not found");
  }
  return record;
}

export async function exportFiltered(filters: FilterState, format: "csv" | "json") {
  const dataset = await loadStaticDataset();
  exportFilteredRecords(dataset.records, filters, format);
}

function defaultEmptyFilters(): FilterState {
  return {
    q: "",
    fields: {},
    quota_min: "",
    quota_max: "",
    working_days_min: "",
    working_days_max: "",
    published_from: "",
    published_to: "",
    sort_by: "published_at",
    order: "desc",
    per_page: "20",
    page: "1",
  };
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
