import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { defaultFilters, type FilterState } from "@/types";

const FILTERS_STORAGE_KEY = "maganghub-filters";

function loadStoredFilters(): FilterState {
  try {
    const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return defaultFilters;
    const parsed = JSON.parse(raw) as Partial<FilterState>;
    return {
      ...defaultFilters,
      ...parsed,
      fields: parsed.fields ?? defaultFilters.fields,
    };
  } catch {
    return defaultFilters;
  }
}

function persistFilters(filters: FilterState) {
  try {
    sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignore storage failures
  }
}

interface FiltersContextValue {
  filters: FilterState;
  setFilters: (next: FilterState | ((current: FilterState) => FilterState)) => void;
  updateFilters: (patch: Partial<FilterState>) => void;
  updateFieldFilter: (field: string, values: string[]) => void;
  resetFilters: () => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<FilterState>(loadStoredFilters);

  const setFilters = useCallback(
    (next: FilterState | ((current: FilterState) => FilterState)) => {
      setFiltersState((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        persistFilters(resolved);
        return resolved;
      });
    },
    [],
  );

  const updateFilters = useCallback(
    (patch: Partial<FilterState>) => {
      setFilters((current) => ({ ...current, ...patch }));
    },
    [setFilters],
  );

  const updateFieldFilter = useCallback(
    (field: string, values: string[]) => {
      setFilters((current) => {
        const nextFields = { ...current.fields };
        if (values.length === 0) {
          delete nextFields[field];
        } else {
          nextFields[field] = values;
        }

        return {
          ...current,
          fields: nextFields,
          page: "1",
        };
      });
    },
    [setFilters],
  );

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [setFilters]);

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      updateFilters,
      updateFieldFilter,
      resetFilters,
    }),
    [filters, resetFilters, setFilters, updateFieldFilter, updateFilters],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

function useFiltersContext() {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error("useFilters must be used within FiltersProvider");
  }
  return context;
}

export function useFilters() {
  return useFiltersContext();
}
