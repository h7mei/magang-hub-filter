import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { fetchListingById } from "@/lib/api";
import {
  addBookmarkListing,
  getBookmarksStorageKey,
  loadBookmarkIds,
  loadBookmarkListings,
  removeBookmarkListing,
} from "@/lib/bookmark-storage";
import type { ListingRecord } from "@/types";

interface BookmarksContextValue {
  ids: Set<string>;
  count: number;
  listings: ListingRecord[];
  loading: boolean;
  isBookmarked: (listingId: string) => boolean;
  toggleBookmark: (listingId: string, listing?: ListingRecord) => Promise<void>;
  refreshBookmarks: () => void;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refreshBookmarks = useCallback(() => {
    const items = loadBookmarkListings();
    setListings(items);
    setIds(new Set(loadBookmarkIds()));
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getBookmarksStorageKey()) {
        refreshBookmarks();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshBookmarks]);

  const toggleBookmark = useCallback(
    async (listingId: string, listing?: ListingRecord) => {
      if (ids.has(listingId)) {
        removeBookmarkListing(listingId);
        refreshBookmarks();
        return;
      }

      const record = listing ?? (await fetchListingById(listingId));
      addBookmarkListing(record);
      refreshBookmarks();
    },
    [ids, refreshBookmarks],
  );

  const value = useMemo(
    () => ({
      ids,
      count: ids.size,
      listings,
      loading,
      isBookmarked: (listingId: string) => ids.has(listingId),
      toggleBookmark,
      refreshBookmarks,
    }),
    [ids, listings, loading, toggleBookmark, refreshBookmarks],
  );

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

export function useBookmarks() {
  const context = useContext(BookmarksContext);
  if (!context) {
    throw new Error("useBookmarks must be used within BookmarksProvider");
  }
  return context;
}
