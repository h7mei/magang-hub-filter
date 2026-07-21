import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface FilterPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const FilterPanelContext = createContext<FilterPanelContextValue | null>(null);

export function FilterPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle,
    }),
    [open, toggle],
  );

  return <FilterPanelContext.Provider value={value}>{children}</FilterPanelContext.Provider>;
}

export function useFilterPanel() {
  const context = useContext(FilterPanelContext);
  if (!context) {
    throw new Error("useFilterPanel must be used within FilterPanelProvider");
  }
  return context;
}
