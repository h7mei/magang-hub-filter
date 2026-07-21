import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { BookmarkButton } from "@/components/bookmarks/bookmark-button";
import { CompanyLogoBadge } from "@/components/company-logo-badge";
import { ListingsMapPanel } from "@/components/map/listings-map-panel";
import { ListingsStatsPanel } from "@/components/stats/listings-stats-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFilters } from "@/hooks/use-filters";
import { useFilteredLayoutContext } from "@/hooks/use-filtered-layout";
import { fetchListings, formatDate } from "@/lib/api";
import type { ListingRecord, ListingsResponse } from "@/types";

export function FilterPage() {
  const { filters, updateFilters } = useFilters();
  const { meta } = useFilteredLayoutContext();
  const [payload, setPayload] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ListingRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      fetchListings(filters)
        .then((response) => {
          if (!cancelled) setPayload(response);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load listings");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filters]);

  const stats = payload?.stats;
  const pagination = payload?.pagination;

  return (
    <div className="min-w-0 space-y-6">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Lowongan Magang</h2>
          <p className="break-words text-sm text-muted-foreground">
            {meta
              ? `${meta.loaded_records.toLocaleString("id-ID")} records loaded • scraped ${meta.scraped_at || "unknown"} • site total ${meta.site_total?.toLocaleString("id-ID") ?? "-"}`
              : "Loading dataset..."}
          </p>
        </div>

        <ListingsMapPanel filters={filters} />

        <ListingsStatsPanel
          stats={stats}
          loadedRecords={meta?.loaded_records}
          loading={loading}
        />

        <Card className="min-w-0 overflow-hidden">
          <CardContent className="min-w-0 px-0 pb-0">
            <div className="space-y-3 p-4 lg:hidden">
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Loading listings...
                </p>
              ) : error ? (
                <p className="py-8 text-center text-sm text-destructive">{error}</p>
              ) : payload?.data.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No listings match the current filters.
                </p>
              ) : (
                payload?.data.map((record) => (
                  <Card key={record.id} className="min-w-0 overflow-hidden">
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <CompanyLogoBadge
                          companyName={record.company_name}
                          companyLogoUrl={record.company_logo_url}
                          size="sm"
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium break-words">{record.position_name}</p>
                          <p className="break-words text-sm">{record.company_name}</p>
                          <p className="break-all text-xs text-muted-foreground">
                            {record.company_email}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span className="break-words">{record.location}</span>
                        <span>•</span>
                        <span>Quota {record.quota}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(record.education_levels ?? []).map((value) => (
                          <Badge key={value} variant="secondary">
                            {value}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(record.published_at)}
                        </span>
                        <div className="flex items-center gap-1">
                          <BookmarkButton listingId={record.id} listing={record} />
                          <Button variant="outline" size="sm" onClick={() => setSelected(record)}>
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="hidden min-w-0 lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Quota</TableHead>
                  <TableHead>Education</TableHead>
                  <TableHead>Programs</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Loading listings...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : payload?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No listings match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  payload?.data.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="max-w-[180px] whitespace-normal font-medium">
                        {record.position_name}
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-normal">
                        <div className="flex items-start gap-3">
                          <CompanyLogoBadge
                            companyName={record.company_name}
                            companyLogoUrl={record.company_logo_url}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="break-words">{record.company_name}</div>
                            <div className="break-all text-xs text-muted-foreground">
                              {record.company_email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">{record.location}</TableCell>
                      <TableCell>{record.quota}</TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="flex flex-wrap gap-1">
                          {(record.education_levels ?? []).map((value) => (
                            <Badge key={value} variant="secondary">
                              {value}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {(record.study_programs ?? []).slice(0, 2).map((value) => (
                            <Badge key={value} variant="outline">
                              {value}
                            </Badge>
                          ))}
                          {(record.study_programs?.length ?? 0) > 2 ? (
                            <Badge variant="outline">+{record.study_programs.length - 2}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <BookmarkButton listingId={record.id} listing={record} />
                          <Button variant="ghost" size="sm" onClick={() => setSelected(record)}>
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>

            <div className="flex flex-col gap-4 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="break-words text-sm text-muted-foreground">
                {pagination
                  ? `Showing ${payload?.data.length ?? 0} of ${pagination.total.toLocaleString("id-ID")} filtered results`
                  : "Loading results..."}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination || pagination.page <= 1}
                  onClick={() =>
                    updateFilters({ page: String(Math.max(1, Number(filters.page) - 1)) })
                  }
                >
                  Previous
                </Button>
                <span className="whitespace-nowrap text-sm text-muted-foreground">
                  Page {pagination?.page ?? 1} / {pagination?.total_pages ?? 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination || pagination.page >= pagination.total_pages}
                  onClick={() => updateFilters({ page: String(Number(filters.page) + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <DialogTitle className="min-w-0 break-words pr-8">{selected?.position_name}</DialogTitle>
            {selected ? (
              <BookmarkButton listingId={selected.id} listing={selected} className="absolute top-4 right-12" />
            ) : null}
          </DialogHeader>
          {selected ? (
            <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-[140px_1fr]">
              <dt className="text-muted-foreground">Company</dt>
              <dd>{selected.company_name}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{selected.company_email || "-"}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{selected.company_phone || "-"}</dd>
              <dt className="text-muted-foreground">Location</dt>
              <dd>{selected.location}</dd>
              <dt className="text-muted-foreground">Address</dt>
              <dd>{selected.address || "-"}</dd>
              <dt className="text-muted-foreground">Coordinates</dt>
              <dd>
                {selected.latitude}, {selected.longitude}
              </dd>
              <dt className="text-muted-foreground">Quota</dt>
              <dd>{selected.quota}</dd>
              <dt className="text-muted-foreground">Education</dt>
              <dd>{selected.education_levels_label || selected.education_levels?.join(", ") || "-"}</dd>
              <dt className="text-muted-foreground">Programs</dt>
              <dd>{selected.study_programs_label || selected.study_programs?.join(", ") || "-"}</dd>
              <dt className="text-muted-foreground">Schedule</dt>
              <dd>
                {selected.working_days_per_week} days/week, off {selected.days_off_label || "-"}
              </dd>
              <dt className="text-muted-foreground">Published</dt>
              <dd>{formatDate(selected.published_at)}</dd>
              <dt className="text-muted-foreground">Description</dt>
              <dd>{selected.task_description || "-"}</dd>
              <dt className="text-muted-foreground">Source</dt>
              <dd>
                <a
                  href={selected.detail_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Open on MagangHub
                  <ExternalLink className="size-3.5" />
                </a>
              </dd>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
