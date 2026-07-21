import { useOutletContext } from "react-router-dom";

import type { MetaResponse } from "@/types";

interface FilteredLayoutContext {
  meta: MetaResponse | null;
}

export function useFilteredLayoutContext() {
  return useOutletContext<FilteredLayoutContext>();
}
