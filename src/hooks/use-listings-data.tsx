import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { StaticDataset } from "@/lib/listings-engine";
import { loadStaticDataset } from "@/lib/static-data";
import type { MetaResponse } from "@/types";

interface ListingsDataContextValue {
  dataset: StaticDataset | null;
  meta: MetaResponse | null;
  loading: boolean;
  error: string | null;
}

const ListingsDataContext = createContext<ListingsDataContextValue | null>(null);

export function ListingsDataProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<StaticDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadStaticDataset()
      .then((loaded) => {
        if (!cancelled) {
          setDataset(loaded);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataset(null);
          setError("Failed to load dashboard data");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      dataset,
      meta: dataset?.meta ?? null,
      loading,
      error,
    }),
    [dataset, loading, error],
  );

  return (
    <ListingsDataContext.Provider value={value}>{children}</ListingsDataContext.Provider>
  );
}

export function useListingsData() {
  const context = useContext(ListingsDataContext);
  if (!context) {
    throw new Error("useListingsData must be used within ListingsDataProvider");
  }
  return context;
}
