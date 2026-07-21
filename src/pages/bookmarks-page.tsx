import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { BookmarkButton } from "@/components/bookmarks/bookmark-button";
import { CompanyLogoBadge } from "@/components/company-logo-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { formatDate } from "@/lib/api";
import type { ListingRecord } from "@/types";

export function BookmarksPage() {
  const location = useLocation();
  const { count, listings, loading, refreshBookmarks } = useBookmarks();
  const [selected, setSelected] = useState<ListingRecord | null>(null);

  useEffect(() => {
    if (location.pathname !== "/bookmarks") {
      return;
    }

    refreshBookmarks();
  }, [location.pathname, location.key, refreshBookmarks]);

  const handleBookmarkToggle = useCallback(
    (bookmarked: boolean) => {
      if (!bookmarked) {
        setSelected((current) => (current ? null : current));
      }
      refreshBookmarks();
    },
    [refreshBookmarks],
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Bookmarks</h2>
          <p className="text-sm text-muted-foreground">
            Saved in this browser only via local storage.
          </p>
        </div>
        <Badge variant="secondary">{count} saved</Badge>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading bookmarks...
          </CardContent>
        </Card>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No bookmarks yet. Save listings from the listings or map pages.
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4">
          {listings.map((record) => (
            <Card key={record.id} className="min-w-0 overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex min-w-0 items-start gap-3">
                  <CompanyLogoBadge
                    companyName={record.company_name}
                    companyLogoUrl={record.company_logo_url}
                    size="md"
                  />
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="break-words text-base">{record.position_name}</CardTitle>
                    <p className="break-words text-sm text-muted-foreground">{record.company_name}</p>
                  </div>
                </div>
                <BookmarkButton
                  listingId={record.id}
                  listing={record}
                  onToggle={handleBookmarkToggle}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{record.location}</Badge>
                  <Badge variant="outline">Quota {record.quota}</Badge>
                  {record.bookmarked_at ? (
                    <Badge variant="outline">Saved {formatDate(record.bookmarked_at)}</Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelected(record)}>
                    View details
                  </Button>
                  <a
                    href={record.detail_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Open on MagangHub
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="flex min-w-0 items-start gap-3 pr-8">
              {selected ? (
                <CompanyLogoBadge
                  companyName={selected.company_name}
                  companyLogoUrl={selected.company_logo_url}
                  size="md"
                />
              ) : null}
              <DialogTitle className="min-w-0 break-words">{selected?.position_name}</DialogTitle>
            </div>
            {selected ? (
              <BookmarkButton
                listingId={selected.id}
                listing={selected}
                className="absolute top-4 right-12"
                onToggle={handleBookmarkToggle}
              />
            ) : null}
          </DialogHeader>
          {selected ? (
            <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-[140px_1fr]">
              <dt className="text-muted-foreground">Company</dt>
              <dd>{selected.company_name}</dd>
              <dt className="text-muted-foreground">Location</dt>
              <dd>{selected.location}</dd>
              <dt className="text-muted-foreground">Quota</dt>
              <dd>{selected.quota}</dd>
              <dt className="text-muted-foreground">Published</dt>
              <dd>{formatDate(selected.published_at)}</dd>
              <dt className="text-muted-foreground">Description</dt>
              <dd>{selected.task_description || "-"}</dd>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
