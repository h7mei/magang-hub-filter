import { FilterSidebar } from "@/components/filters/filter-sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFilterPanel } from "@/hooks/use-filter-panel";
import { useFilters } from "@/hooks/use-filters";
import { useListingsData } from "@/hooks/use-listings-data";

export function FilterModal() {
  const { open, setOpen } = useFilterPanel();
  const { filters, updateFilters, updateFieldFilter, resetFilters } = useFilters();
  const { meta, loading } = useListingsData();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton
        className="!flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
      >
        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
          <DialogTitle>Advanced Filters</DialogTitle>
          <DialogDescription>
            Shared across listings and map views
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {meta ? (
            <FilterSidebar
              showHeader={false}
              filters={filters}
              options={meta.filter_options}
              onChange={updateFilters}
              onFieldChange={updateFieldFilter}
              onReset={resetFilters}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {loading ? "Loading filters..." : "Filter options unavailable"}
            </p>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-end">
          <Button type="button" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
