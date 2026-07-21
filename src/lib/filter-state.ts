import type { FilterState } from "@/types";

export function hasActiveFilters(filters: FilterState): boolean {
  if (filters.q.trim()) return true;
  if (Object.keys(filters.fields).length > 0) return true;
  if (filters.quota_min || filters.quota_max) return true;
  if (filters.working_days_min || filters.working_days_max) return true;
  return false;
}
