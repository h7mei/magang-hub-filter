import type { FeatureCollection, Point } from "geojson";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BookmarkCoachDemo } from "@/components/coach-marks/bookmark-coach-demo";
import { BookmarkButton } from "@/components/bookmarks/bookmark-button";
import { CompanyLogoBadge } from "@/components/company-logo-badge";
import { MapCompanyMarkersLayer } from "@/components/map/map-company-markers-layer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, MapControls } from "@/components/ui/map";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCoachMarks } from "@/hooks/use-coach-marks";
import { fetchCompanyListings, fetchMapCompanies, formatDate } from "@/lib/api";
import type {
  CompanyListingsResponse,
  CompanyMapProperties,
  FilterState,
  ListingRecord,
  MapCompaniesResponse,
} from "@/types";

const INDONESIA_CENTER: [number, number] = [117.5, -2.5];

function PositionCard({ listing }: { listing: ListingRecord }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium break-words">{listing.position_name}</p>
          <p className="text-sm break-words text-muted-foreground">{listing.location}</p>
        </div>
        <BookmarkButton listingId={listing.id} listing={listing} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">Quota {listing.quota}</Badge>
        {(listing.education_levels ?? []).slice(0, 2).map((level) => (
          <Badge key={level} variant="outline">
            {level}
          </Badge>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{formatDate(listing.published_at)}</span>
        <a
          href={listing.detail_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          View on MagangHub
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

function CompanyPositionsDetail({
  payload,
  loading,
  preview,
  onClose,
  showBookmarkCoachDemo,
}: {
  payload: CompanyListingsResponse | null;
  loading: boolean;
  preview: CompanyMapProperties | null;
  onClose: () => void;
  showBookmarkCoachDemo: boolean;
}) {
  if (showBookmarkCoachDemo) {
    return (
      <Card className="flex h-full min-h-0 min-w-0 flex-col">
        <CardContent className="flex flex-1 flex-col items-stretch justify-start pt-6">
          <BookmarkCoachDemo />
        </CardContent>
      </Card>
    );
  }

  if (!payload && !loading && !preview) {
    return (
      <Card className="flex h-full min-h-0 min-w-0 flex-col">
        <CardContent className="flex flex-1 items-center justify-center py-10 text-center text-sm text-muted-foreground">
          Click a company marker to view available positions here.
        </CardContent>
      </Card>
    );
  }

  const company = payload?.company || preview;

  return (
    <Card className="flex h-full min-h-0 min-w-0 flex-col">
      <CardHeader className="flex shrink-0 flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex min-w-0 items-start gap-3">
          {company ? (
            <CompanyLogoBadge
              companyName={company.company_name}
              companyLogoUrl={company.company_logo_url}
              size="lg"
            />
          ) : null}
          <div className="min-w-0 space-y-1">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading company positions...
              </div>
            ) : company ? (
              <>
                <CardTitle className="break-words text-lg">{company.company_name}</CardTitle>
                <p className="break-words text-sm text-muted-foreground">
                  {company.location || "Indonesia"}
                </p>
              </>
            ) : null}
          </div>
        </div>
        {company ? (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Clear selection">
            <X className="size-4" />
          </Button>
        ) : null}
      </CardHeader>

      {company ? (
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant="secondary">
              {payload?.count ?? company.position_count} positions
            </Badge>
            <Badge variant="outline">
              Total quota {payload?.company.total_quota ?? company.total_quota}
            </Badge>
            {company.company_email ? (
              <Badge variant="outline" className="max-w-full truncate">
                {company.company_email}
              </Badge>
            ) : null}
          </div>

          {loading ? (
            <p className="shrink-0 text-sm text-muted-foreground">Fetching open roles...</p>
          ) : payload?.data.length ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <h3 className="shrink-0 text-sm font-medium">Available Positions</h3>
              <ScrollArea className="h-0 flex-1 pr-3">
                <div className="space-y-3">
                  {payload.data.map((listing) => (
                    <PositionCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <p className="shrink-0 text-sm text-muted-foreground">
              No positions found for this company.
            </p>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function ListingsMapPanel({ filters }: { filters: FilterState }) {
  const { active, step } = useCoachMarks();
  const showBookmarkCoachDemo = active && step?.id === "bookmark";
  const [mapData, setMapData] = useState<MapCompaniesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<CompanyMapProperties | null>(null);
  const [companyPayload, setCompanyPayload] = useState<CompanyListingsResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedMarkerId(null);
    setSelectedPreview(null);
    setCompanyPayload(null);
    setDetailLoading(false);

    const timer = window.setTimeout(() => {
      fetchMapCompanies(filters)
        .then((response) => {
          if (!cancelled) setMapData(response);
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load company map data");
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

  const geoJson = useMemo<FeatureCollection<Point, CompanyMapProperties>>(() => {
    if (!mapData) {
      return { type: "FeatureCollection", features: [] };
    }
    return mapData as FeatureCollection<Point, CompanyMapProperties>;
  }, [mapData]);

  const handleCompanyClick = (company: CompanyMapProperties, coordinates: [number, number]) => {
    setSelectedMarkerId(company.marker_id ?? null);
    setSelectedPreview(company);
    setCompanyPayload(null);
    setDetailLoading(true);

    fetchCompanyListings(
      company.company_name,
      {
        location: company.location,
        latitude: company.latitude ?? coordinates[1],
        longitude: company.longitude ?? coordinates[0],
      },
      filters,
    )
      .then(setCompanyPayload)
      .catch(() => setCompanyPayload(null))
      .finally(() => setDetailLoading(false));
  };

  const clearSelection = () => {
    setSelectedMarkerId(null);
    setSelectedPreview(null);
    setCompanyPayload(null);
    setDetailLoading(false);
  };

  return (
    <section className="min-w-0">
      <div className="grid min-h-[360px] min-w-0 grid-cols-1 gap-4 lg:h-[min(55vh,640px)] lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <Card className="flex min-h-[280px] min-w-0 flex-col overflow-hidden py-0 lg:min-h-0">
          <CardContent className="relative min-h-0 flex-1 p-0">
            <div className="absolute inset-0 overflow-hidden">
              {loading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading companies...
                  </div>
                </div>
              ) : null}
              {error ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              ) : null}
              <Map
                center={INDONESIA_CENTER}
                zoom={4.2}
                theme="dark"
                className="size-full max-w-full"
              >
                <MapCompanyMarkersLayer
                  data={geoJson}
                  selectedMarkerId={selectedMarkerId}
                  clusterMaxZoom={11}
                  clusterRadius={56}
                  onCompanyClick={handleCompanyClick}
                />
                <MapControls showZoom showCompass showLocate showFullscreen />
              </Map>
            </div>
          </CardContent>
        </Card>

        <CompanyPositionsDetail
          payload={companyPayload}
          loading={detailLoading}
          preview={selectedPreview}
          onClose={clearSelection}
          showBookmarkCoachDemo={showBookmarkCoachDemo}
        />
      </div>
    </section>
  );
}
