import { Bookmark, Filter, HelpCircle, SlidersHorizontal } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { CoachMarksOverlay } from "@/components/coach-marks/coach-marks-overlay";
import { FilterModal } from "@/components/filters/filter-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useCoachMarks } from "@/hooks/use-coach-marks";
import { useFilterPanel } from "@/hooks/use-filter-panel";
import { hasActiveFilters } from "@/lib/filter-state";
import { useFilters } from "@/hooks/use-filters";
import { cn } from "@/lib/utils";

const navItems = [
  {
    to: "/",
    label: "Listings & Map",
    description: "Search, filter, and explore internship locations",
    icon: Filter,
  },
  {
    to: "/bookmarks",
    label: "Bookmarks",
    description: "Saved in this browser via local storage",
    icon: Bookmark,
    showCount: true,
  },
] as const;

function isNavItemActive(pathname: string, item: (typeof navItems)[number]) {
  return pathname === item.to;
}

export function AppShell() {
  const { count } = useBookmarks();
  const location = useLocation();
  const { resetTour } = useCoachMarks();
  const { setOpen: setFilterModalOpen } = useFilterPanel();
  const { filters } = useFilters();
  const isFilteredRoute = location.pathname === "/";
  const filtersActive = hasActiveFilters(filters);

  return (
    <div className="min-h-svh overflow-x-hidden bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              MH
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight">
                MagangHub Filter
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                MagangHub filters suck — scrape once, filter faster
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={resetTour}
              aria-label="Show tips"
              title="Show tips"
            >
              <HelpCircle className="size-4" />
            </Button>
            {isFilteredRoute ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                data-coach-mark="filters"
                onClick={() => setFilterModalOpen(true)}
              >
                <SlidersHorizontal className="size-4" />
                Filters
                {filtersActive ? (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    Active
                  </Badge>
                ) : null}
              </Button>
            ) : null}
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Kemnaker Magang Nasional
            </Badge>
          </div>
        </div>
        <div className="mx-auto max-w-[1600px] px-4 lg:px-6">
          <nav className="grid gap-2 pb-2 sm:grid-cols-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                data-coach-mark={item.to === "/bookmarks" ? "bookmarks-nav" : undefined}
                className={() =>
                  cn(
                    "flex min-w-0 items-start gap-3 rounded-lg border px-3 py-3 transition-colors sm:px-4",
                    isNavItemActive(location.pathname, item)
                      ? "border-primary/30 bg-primary text-primary-foreground shadow-sm"
                      : "border-transparent bg-background hover:bg-accent",
                  )
                }
              >
                {(() => {
                  const isActive = isNavItemActive(location.pathname, item);

                  return (
                    <>
                      <item.icon
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          !isActive && "text-muted-foreground",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="block text-sm font-medium">{item.label}</span>
                          {"showCount" in item && item.showCount && count > 0 ? (
                            <Badge
                              variant={isActive ? "secondary" : "outline"}
                              className="h-5 px-1.5 text-[10px]"
                            >
                              {count}
                            </Badge>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "block text-xs leading-snug",
                            isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                          )}
                        >
                          {item.description}
                        </span>
                      </span>
                    </>
                  );
                })()}
              </NavLink>
            ))}
          </nav>
        </div>
        <Separator />
      </header>

      <main className="mx-auto min-w-0 max-w-[1600px] px-4 py-6 lg:px-6">
        <Outlet />
      </main>

      {isFilteredRoute ? <FilterModal /> : null}
      <CoachMarksOverlay />
    </div>
  );
}
