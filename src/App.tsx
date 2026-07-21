import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { FilteredLayout } from "@/components/layout/filtered-layout";
import { BookmarksProvider } from "@/hooks/use-bookmarks";
import { CoachMarksProvider } from "@/hooks/use-coach-marks";
import { FilterPanelProvider } from "@/hooks/use-filter-panel";
import { FiltersProvider } from "@/hooks/use-filters";
import { ListingsDataProvider } from "@/hooks/use-listings-data";
import { BookmarksPage } from "@/pages/bookmarks-page";
import { FilterPage } from "@/pages/filter-page";

export default function App() {
  return (
    <BrowserRouter>
      <ListingsDataProvider>
        <BookmarksProvider>
          <FiltersProvider>
            <FilterPanelProvider>
            <CoachMarksProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route element={<FilteredLayout />}>
                  <Route index element={<FilterPage />} />
                </Route>
                <Route path="map" element={<Navigate to="/" replace />} />
                <Route path="bookmarks" element={<BookmarksPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
            </CoachMarksProvider>
            </FilterPanelProvider>
          </FiltersProvider>
        </BookmarksProvider>
      </ListingsDataProvider>
    </BrowserRouter>
  );
}
