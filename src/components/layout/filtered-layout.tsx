import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { useListingsData } from "@/hooks/use-listings-data";
import type { MetaResponse } from "@/types";

const SLOW_LOAD_MESSAGE_DELAY_MS = 2500;

export function FilteredLayout() {
  const { meta, loading, error } = useListingsData();
  const [resolvedMeta, setResolvedMeta] = useState<MetaResponse | null>(null);
  const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

  useEffect(() => {
    setResolvedMeta(meta);
  }, [meta]);

  useEffect(() => {
    if (!loading || resolvedMeta) {
      setShowSlowLoadMessage(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowSlowLoadMessage(true);
    }, SLOW_LOAD_MESSAGE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      setShowSlowLoadMessage(false);
    };
  }, [loading, resolvedMeta]);

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
      <div className="py-10 text-center text-sm text-muted-foreground">
        <p>Loading dashboard data...</p>
        {showSlowLoadMessage ? (
          <p className="mt-2 text-xs">
            Still loading listings — large datasets can take a moment on slower connections.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <Outlet context={{ meta: resolvedMeta }} />
    </div>
  );
}
