import { CompanyLogoBadge } from "@/components/company-logo-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ListingsStats } from "@/types";

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function HorizontalBarChart({
  items,
  emptyLabel = "No data",
}: {
  items: [string, number][];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map(([, count]) => count), 1);

  return (
    <div className="space-y-3">
      {items.map(([label, count]) => (
        <div key={label} className="space-y-1.5">
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="line-clamp-2 min-w-0 leading-snug">{label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {count.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TopCompaniesChart({ items }: { items: ListingsStats["top_companies"] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No data</p>;
  }

  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.name} className="space-y-1.5">
          <div className="flex items-center gap-3">
            <CompanyLogoBadge
              companyName={item.name}
              companyLogoUrl={item.company_logo_url}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2 text-sm">
                <span className="line-clamp-2 min-w-0 leading-snug">{item.name}</span>
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {item.count.toLocaleString("id-ID")}
                </Badge>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ListingsStatsPanelProps {
  stats: ListingsStats | undefined;
  loadedRecords?: number;
  loading?: boolean;
}

export function ListingsStatsPanel({
  stats,
  loadedRecords,
  loading = false,
}: ListingsStatsPanelProps) {
  if (loading && !stats) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading statistics...
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const matchRate =
    loadedRecords && loadedRecords > 0
      ? `${((stats.filtered_count / loadedRecords) * 100).toFixed(1)}%`
      : "—";
  const mappableRate =
    stats.filtered_count > 0
      ? `${((stats.mappable_listings / stats.filtered_count) * 100).toFixed(1)}%`
      : "0%";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Filtered Results"
          value={stats.filtered_count.toLocaleString("id-ID")}
          hint={`${matchRate} of loaded dataset`}
        />
        <StatCard
          title="Unique Companies"
          value={stats.unique_companies.toLocaleString("id-ID")}
          hint={`${stats.unique_positions.toLocaleString("id-ID")} unique positions`}
        />
        <StatCard
          title="Unique Locations"
          value={stats.unique_locations.toLocaleString("id-ID")}
          hint={`${stats.mappable_listings.toLocaleString("id-ID")} on map (${mappableRate})`}
        />
        <StatCard
          title="Total Quota"
          value={stats.total_quota.toLocaleString("id-ID")}
          hint={`Avg ${stats.avg_quota.toLocaleString("id-ID")} per listing`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart items={stats.top_locations} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <TopCompaniesChart items={stats.top_companies} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Education Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart items={stats.top_education} emptyLabel="No education data" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Types</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart items={stats.top_company_types} emptyLabel="No company type data" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart items={stats.top_positions} emptyLabel="No position data" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Study Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart items={stats.top_study_programs} emptyLabel="No study program data" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
