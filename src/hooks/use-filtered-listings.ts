import { useMemo } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useListingsData } from "@/hooks/use-listings-data";
import { buildMapCompanies, buildStats, filterRecords, paginateListings, sortRecords } from "@/lib/listings-engine";
import type { FilterState, ListingsResponse, MapCompaniesResponse } from "@/types";

const SEARCH_DEBOUNCE_MS = 250;

export interface FilteredListingsResult {
  listings: ListingsResponse | null;
  mapData: MapCompaniesResponse | null;
  loading: boolean;
  error: string | null;
  searchPending: boolean;
}

function buildCoreFilters(filters: FilterState, debouncedQ: string): FilterState {
  return {
    ...filters,
    q: debouncedQ,
    page: "1",
  };
}

export function useFilteredListings(filters: FilterState): FilteredListingsResult {
  const { dataset, loading: datasetLoading, error: datasetError } = useListingsData();
  const debouncedQ = useDebouncedValue(filters.q, SEARCH_DEBOUNCE_MS);
  const searchPending = filters.q !== debouncedQ;

  const coreFilters = useMemo(
    () => buildCoreFilters(filters, debouncedQ),
    [
      debouncedQ,
      filters.fields,
      filters.quota_min,
      filters.quota_max,
      filters.working_days_min,
      filters.working_days_max,
      filters.published_from,
      filters.published_to,
      filters.sort_by,
      filters.order,
      filters.per_page,
    ],
  );

  const queryFilters = useMemo(
    () => ({
      ...filters,
      q: debouncedQ,
    }),
    [filters, debouncedQ],
  );

  const heavyPipeline = useMemo(() => {
    if (!dataset) {
      return null;
    }

    const filtered = filterRecords(dataset.records, coreFilters);
    const sorted = sortRecords(filtered, coreFilters.sort_by, coreFilters.order);
    const stats = buildStats(filtered);
    const mapData = buildMapCompanies(filtered);

    return { filtered, sorted, stats, mapData };
  }, [dataset, coreFilters]);

  const listings = useMemo(() => {
    if (!heavyPipeline) {
      return null;
    }

    return paginateListings(heavyPipeline.sorted, heavyPipeline.filtered, queryFilters, heavyPipeline.stats);
  }, [heavyPipeline, queryFilters]);

  return {
    listings,
    mapData: heavyPipeline?.mapData ?? null,
    loading: datasetLoading || !heavyPipeline,
    error: datasetError,
    searchPending,
  };
}
