import type { ListingRecord } from "@/types";

const BOOKMARKS_STORAGE_KEY = "maganghub-bookmarks";

interface BookmarkStore {
  updated_at: string | null;
  items: ListingRecord[];
}

function readStore(): BookmarkStore {
  if (typeof window === "undefined") {
    return { updated_at: null, items: [] };
  }

  try {
    const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) {
      return { updated_at: null, items: [] };
    }

    const parsed = JSON.parse(raw) as Partial<BookmarkStore>;
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return {
      updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : null,
      items: items.filter((item): item is ListingRecord => Boolean(item?.id)),
    };
  } catch {
    return { updated_at: null, items: [] };
  }
}

function writeStore(items: ListingRecord[]): BookmarkStore {
  const payload: BookmarkStore = {
    updated_at: new Date().toISOString(),
    items,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(payload));
  }

  return payload;
}

export function loadBookmarkListings(): ListingRecord[] {
  return readStore().items;
}

export function loadBookmarkIds(): string[] {
  return readStore().items.map((item) => item.id);
}

export function addBookmarkListing(record: ListingRecord): void {
  const nextItems = readStore().items.filter((item) => item.id !== record.id);
  nextItems.unshift({
    ...record,
    bookmarked_at: new Date().toISOString(),
  });
  writeStore(nextItems);
}

export function removeBookmarkListing(listingId: string): void {
  writeStore(readStore().items.filter((item) => item.id !== listingId));
}

export function isBookmarkStored(listingId: string): boolean {
  return readStore().items.some((item) => item.id === listingId);
}

export function getBookmarksStorageKey(): string {
  return BOOKMARKS_STORAGE_KEY;
}
