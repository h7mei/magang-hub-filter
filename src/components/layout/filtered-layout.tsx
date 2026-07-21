import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { useListingsData } from "@/hooks/use-listings-data";
import type { MetaResponse } from "@/types";

export function FilteredLayout() {
  const { meta, loading, error } = useListingsData();
  const [resolvedMeta, setResolvedMeta] = useState<MetaResponse | null>(null);

  useEffect(() => {
    setResolvedMeta(meta);
  }, [meta]);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        {error}. Ensure <code className="font-mono">public/data/listings.json</code> exists,
        then refresh the page.
      </div>
    );
  }

  if (loading && !resolvedMeta) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">Loading dashboard data...</div>
    );
  }

  return (
    <div className="min-w-0">
      <Outlet context={{ meta: resolvedMeta }} />
    </div>
  );
}
