import { RotateCcw } from "lucide-react";

import { MultiSelectFilter } from "@/components/filters/multi-select-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getFilterFieldLabel, getMultiSelectFilterFields } from "@/lib/filter-fields";
import type { FilterState, FilterOptions } from "@/types";

interface FilterSidebarProps {
  filters: FilterState;
  options: FilterOptions;
  onChange: (patch: Partial<FilterState>) => void;
  onFieldChange: (field: string, values: string[]) => void;
  onReset: () => void;
  showHeader?: boolean;
}

export function FilterSidebar({
  filters,
  options,
  onChange,
  onFieldChange,
  onReset,
  showHeader = true,
}: FilterSidebarProps) {
  const multiSelectFields = getMultiSelectFilterFields(options);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {showHeader ? (
        <>
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Advanced Filters</h2>
              <p className="text-xs text-muted-foreground">
                Shared across listings and map views
              </p>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={onReset}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>

          <Separator />
        </>
      ) : (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            type="search"
            placeholder="Position, company, program..."
            value={filters.q}
            onChange={(event) => onChange({ q: event.target.value, page: "1" })}
          />
        </div>

        {multiSelectFields.map((field) => (
          <MultiSelectFilter
            key={field}
            label={getFilterFieldLabel(field)}
            options={options[field] ?? []}
            selected={filters.fields[field] ?? []}
            onChange={(values) => onFieldChange(field, values)}
          />
        ))}

        <div className="min-w-0 space-y-2">
          <Label htmlFor="quotaMin">Quota Min</Label>
          <Input
            id="quotaMin"
            type="number"
            min={0}
            value={filters.quota_min}
            onChange={(event) => onChange({ quota_min: event.target.value, page: "1" })}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="quotaMax">Quota Max</Label>
          <Input
            id="quotaMax"
            type="number"
            min={0}
            value={filters.quota_max}
            onChange={(event) => onChange({ quota_max: event.target.value, page: "1" })}
          />
        </div>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="workDaysMin">Work Days Min</Label>
          <Input
            id="workDaysMin"
            type="number"
            min={1}
            max={7}
            value={filters.working_days_min}
            onChange={(event) =>
              onChange({ working_days_min: event.target.value, page: "1" })
            }
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="workDaysMax">Work Days Max</Label>
          <Input
            id="workDaysMax"
            type="number"
            min={1}
            max={7}
            value={filters.working_days_max}
            onChange={(event) =>
              onChange({ working_days_max: event.target.value, page: "1" })
            }
          />
        </div>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="publishedFrom">Published From</Label>
          <Input
            id="publishedFrom"
            type="date"
            value={filters.published_from}
            onChange={(event) =>
              onChange({ published_from: event.target.value, page: "1" })
            }
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="publishedTo">Published To</Label>
          <Input
            id="publishedTo"
            type="date"
            value={filters.published_to}
            onChange={(event) =>
              onChange({ published_to: event.target.value, page: "1" })
            }
          />
        </div>
      </div>
    </div>
  );
}
