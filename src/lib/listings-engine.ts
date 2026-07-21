import type {
  CompanyListingsResponse,
  FilterState,
  ListingRecord,
  ListingsResponse,
  ListingsStats,
  MapCompaniesResponse,
  MapPointsResponse,
  MetaResponse,
} from "@/types";

const FILTER_EXCLUDED_FIELDS = new Set(["id", "detail_url", "company_logo_url", "latitude", "longitude"]);

const FILTER_FIELD_ALIASES: Record<string, string> = {
  companies: "company_name",
  locations: "location",
  company_types: "company_type",
};

const INDONESIA_LAT_RANGE: [number, number] = [-15.0, 10.0];
const INDONESIA_LNG_RANGE: [number, number] = [90.0, 145.0];

function parseDatetime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.replace("Z", "+00:00");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function matchesSearch(record: ListingRecord, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const haystacks = [
    record.position_name,
    record.company_name,
    record.location,
    record.address,
    record.task_description,
    (record.study_programs ?? []).join(", "),
    (record.education_levels ?? []).join(", "),
  ];
  const combined = haystacks
    .filter((item) => item)
    .join(" ")
    .toLowerCase();
  return combined.includes(needle);
}

function matchesRange(value: number | null | undefined, minimum: number | null, maximum: number | null): boolean {
  if (value == null) {
    return minimum == null && maximum == null;
  }
  if (minimum != null && value < minimum) return false;
  if (maximum != null && value > maximum) return false;
  return true;
}

function matchesDateRange(value: string | null | undefined, start: Date | null, end: Date | null): boolean {
  if (!start && !end) return true;

  const parsed = parseDatetime(value);
  if (!parsed) return false;
  if (start && parsed < start) return false;
  if (end && parsed > end) return false;
  return true;
}

function recordMatchesFieldFilter(record: ListingRecord, field: string, selected: string[]): boolean {
  if (selected.length === 0) return true;

  const raw = record[field as keyof ListingRecord];
  if (Array.isArray(raw)) {
    return raw.some((item) => selected.includes(String(item)));
  }

  if (raw == null || raw === "") return false;
  return selected.includes(String(raw));
}

function mergeFieldFilters(filters: FilterState): Record<string, string[]> {
  const merged: Record<string, string[]> = {};

  const extend = (field: string, values: string[]) => {
    if (values.length === 0) return;
    const current = merged[field] ?? [];
    for (const value of values) {
      if (!current.includes(value)) {
        current.push(value);
      }
    }
    merged[field] = current;
  };

  for (const [field, values] of Object.entries(filters.fields)) {
    if (!FILTER_EXCLUDED_FIELDS.has(field)) {
      extend(field, values);
    }
  }

  return merged;
}

function parseOptionalInt(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function filterRecords(records: ListingRecord[], filters: FilterState): ListingRecord[] {
  const mergedFieldFilters = mergeFieldFilters(filters);
  const quotaMin = parseOptionalInt(filters.quota_min);
  const quotaMax = parseOptionalInt(filters.quota_max);
  const workingDaysMin = parseOptionalInt(filters.working_days_min);
  const workingDaysMax = parseOptionalInt(filters.working_days_max);
  const publishedFrom = filters.published_from ? parseDatetime(`${filters.published_from}T00:00:00`) : null;
  const publishedTo = filters.published_to ? parseDatetime(`${filters.published_to}T23:59:59`) : null;

  return records.filter((record) => {
    if (!matchesSearch(record, filters.q)) return false;

    for (const [field, selected] of Object.entries(mergedFieldFilters)) {
      if (!recordMatchesFieldFilter(record, field, selected)) {
        return false;
      }
    }

    if (!matchesRange(record.quota, quotaMin, quotaMax)) return false;
    if (!matchesRange(record.working_days_per_week, workingDaysMin, workingDaysMax)) {
      return false;
    }
    if (!matchesDateRange(record.published_at, publishedFrom, publishedTo)) {
      return false;
    }

    return true;
  });
}

function sortKey(record: ListingRecord, sortBy: string): [unknown, unknown] {
  if (sortBy === "published_at") {
    const parsed = parseDatetime(record.published_at);
    return [parsed == null, parsed ?? new Date(0)];
  }
  if (sortBy === "quota" || sortBy === "working_days_per_week") {
    const value = record[sortBy as keyof ListingRecord] as number | undefined;
    return [value == null, value ?? 0];
  }
  if (sortBy === "education_levels" || sortBy === "study_programs" || sortBy === "days_off") {
    const values = (record[sortBy as keyof ListingRecord] as string[] | undefined) ?? [];
    return [values.length, values.join(", ").toLowerCase()];
  }
  const value = record[sortBy as keyof ListingRecord];
  return [value == null, String(value ?? "").toLowerCase()];
}

export function sortRecords(records: ListingRecord[], sortBy: string, order: string): ListingRecord[] {
  const reverse = order.toLowerCase() === "desc";
  return [...records].sort((left, right) => {
    const leftKey = sortKey(left, sortBy);
    const rightKey = sortKey(right, sortBy);

    for (let index = 0; index < leftKey.length; index += 1) {
      const leftValue = leftKey[index];
      const rightValue = rightKey[index];
      if (leftValue === rightValue) continue;
      if (leftValue == null) return reverse ? 1 : -1;
      if (rightValue == null) return reverse ? -1 : 1;
      if (leftValue < rightValue) return reverse ? 1 : -1;
      if (leftValue > rightValue) return reverse ? -1 : 1;
    }
    return 0;
  });
}

function topEntries(counts: Record<string, number>, limit = 8): [string, number][] {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit);
}

export function buildStats(records: ListingRecord[]): ListingsStats {
  const companies = new Set<string>();
  const locations = new Set<string>();
  const positions = new Set<string>();
  let totalQuota = 0;

  const topLocations: Record<string, number> = {};
  const topCompanies: Record<string, number> = {};
  const topPositions: Record<string, number> = {};
  const topEducation: Record<string, number> = {};
  const topCompanyTypes: Record<string, number> = {};
  const topStudyPrograms: Record<string, number> = {};
  const companyLogos: Record<string, string> = {};

  let workingDaysTotal = 0;
  let workingDaysCount = 0;
  let mappableListings = 0;

  for (const record of records) {
    const location = record.location;
    const company = record.company_name;
    const position = record.position_name;

    if (location) {
      locations.add(location);
      topLocations[location] = (topLocations[location] ?? 0) + 1;
    }
    if (company) {
      companies.add(company);
      topCompanies[company] = (topCompanies[company] ?? 0) + 1;
      if (!companyLogos[company] && record.company_logo_url) {
        companyLogos[company] = record.company_logo_url;
      }
    }
    if (position) {
      positions.add(position);
      topPositions[position] = (topPositions[position] ?? 0) + 1;
    }

    const companyType = record.company_type;
    if (companyType) {
      topCompanyTypes[companyType] = (topCompanyTypes[companyType] ?? 0) + 1;
    }

    for (const level of record.education_levels ?? []) {
      if (level) {
        topEducation[level] = (topEducation[level] ?? 0) + 1;
      }
    }

    for (const program of record.study_programs ?? []) {
      if (program) {
        topStudyPrograms[program] = (topStudyPrograms[program] ?? 0) + 1;
      }
    }

    totalQuota += record.quota ?? 0;

    const workingDays = record.working_days_per_week;
    if (typeof workingDays === "number") {
      workingDaysTotal += workingDays;
      workingDaysCount += 1;
    }

    if (parseRecordCoordinates(record) != null) {
      mappableListings += 1;
    }
  }

  const filteredCount = records.length;

  return {
    filtered_count: filteredCount,
    unique_companies: companies.size,
    unique_locations: locations.size,
    unique_positions: positions.size,
    total_quota: totalQuota,
    avg_quota: filteredCount ? Math.round((totalQuota / filteredCount) * 10) / 10 : 0,
    avg_working_days: workingDaysCount ? Math.round((workingDaysTotal / workingDaysCount) * 10) / 10 : 0,
    mappable_listings: mappableListings,
    top_locations: topEntries(topLocations),
    top_companies: topEntries(topCompanies).map(([name, count]) => ({
      name,
      count,
      company_logo_url: companyLogos[name],
    })),
    top_positions: topEntries(topPositions),
    top_education: topEntries(topEducation),
    top_company_types: topEntries(topCompanyTypes),
    top_study_programs: topEntries(topStudyPrograms),
  };
}

export function parseRecordCoordinates(record: ListingRecord): [number, number] | null {
  const latitude = record.latitude;
  const longitude = record.longitude;
  if (latitude == null || latitude === "" || longitude == null || longitude === "") {
    return null;
  }

  let lat = Number.parseFloat(String(latitude));
  let lng = Number.parseFloat(String(longitude));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat === 0 && lng === 0) return null;

  if (
    lat >= INDONESIA_LAT_RANGE[0] &&
    lat <= INDONESIA_LAT_RANGE[1] &&
    lng >= INDONESIA_LNG_RANGE[0] &&
    lng <= INDONESIA_LNG_RANGE[1]
  ) {
    // Already valid.
  } else if (
    lng >= INDONESIA_LAT_RANGE[0] &&
    lng <= INDONESIA_LAT_RANGE[1] &&
    lat >= INDONESIA_LNG_RANGE[0] &&
    lat <= INDONESIA_LNG_RANGE[1]
  ) {
    [lat, lng] = [lng, lat];
  }

  if (lat < INDONESIA_LAT_RANGE[0] || lat > INDONESIA_LAT_RANGE[1]) return null;
  if (lng < INDONESIA_LNG_RANGE[0] || lng > INDONESIA_LNG_RANGE[1]) return null;

  return [lng, lat];
}

function roundCoordinate(lng: number, lat: number, precision = 5): [number, number] {
  const factor = 10 ** precision;
  return [Math.round(lng * factor) / factor, Math.round(lat * factor) / factor];
}

function coordinatesMatch(left: [number, number], right: [number, number]): boolean {
  const roundedLeft = roundCoordinate(left[0], left[1]);
  const roundedRight = roundCoordinate(right[0], right[1]);
  return roundedLeft[0] === roundedRight[0] && roundedLeft[1] === roundedRight[1];
}

function normalizeLocation(value: string | null | undefined): string {
  if (typeof value !== "string") return "Indonesia";
  const cleaned = value.trim();
  return cleaned || "Indonesia";
}

function pickModeCoordinate(coords: Array<[number, number]>): [number, number] | null {
  if (coords.length === 0) return null;

  const rounded = coords.map(([lng, lat]) => roundCoordinate(lng, lat, 4));
  const counts = new Map<string, { coord: [number, number]; count: number }>();

  for (const coord of rounded) {
    const key = `${coord[0]},${coord[1]}`;
    const current = counts.get(key);
    if (current) {
      current.count += 1;
    } else {
      counts.set(key, { coord, count: 1 });
    }
  }

  let best: { coord: [number, number]; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) {
      best = entry;
    }
  }
  return best?.coord ?? null;
}

export function buildMapCompanies(records: ListingRecord[]): MapCompaniesResponse {
  const grouped = new Map<
    string,
    {
      company_name: string;
      location: string;
      company_logo_url?: string;
      company_email?: string;
      company_phone?: string;
      coords: Array<[number, number]>;
      position_count: number;
      total_quota: number;
    }
  >();

  for (const record of records) {
    const companyName = record.company_name;
    if (!companyName) continue;

    const coordinates = parseRecordCoordinates(record);
    if (!coordinates) continue;

    const location = normalizeLocation(record.location);
    const bucketKey = `${companyName}\0${location}`;
    let bucket = grouped.get(bucketKey);
    if (!bucket) {
      bucket = {
        company_name: companyName,
        location,
        company_logo_url: record.company_logo_url,
        company_email: record.company_email,
        company_phone: record.company_phone,
        coords: [],
        position_count: 0,
        total_quota: 0,
      };
      grouped.set(bucketKey, bucket);
    }

    bucket.position_count += 1;
    bucket.total_quota += record.quota ?? 0;
    bucket.coords.push(coordinates);

    if (!bucket.company_logo_url && record.company_logo_url) {
      bucket.company_logo_url = record.company_logo_url;
    }
    if (!bucket.company_email && record.company_email) {
      bucket.company_email = record.company_email;
    }
    if (!bucket.company_phone && record.company_phone) {
      bucket.company_phone = record.company_phone;
    }
  }

  const features: MapCompaniesResponse["features"] = [];
  const uniqueCompanies = new Set<string>();

  for (const bucket of grouped.values()) {
    const companyCoordinates = pickModeCoordinate(bucket.coords);
    if (!companyCoordinates) continue;

    const [lng, lat] = companyCoordinates;
    uniqueCompanies.add(bucket.company_name);
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
      properties: {
        marker_id: `${bucket.company_name}@${lng},${lat}`,
        company_name: bucket.company_name,
        company_logo_url: bucket.company_logo_url,
        company_email: bucket.company_email,
        company_phone: bucket.company_phone,
        location: bucket.location,
        latitude: lat,
        longitude: lng,
        position_count: bucket.position_count,
        total_quota: bucket.total_quota,
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
    stats: {
      total_locations: features.length,
      total_companies: uniqueCompanies.size,
      total_listings: records.length,
    },
  };
}

export function buildMapPoints(records: ListingRecord[]): MapPointsResponse {
  const features: MapPointsResponse["features"] = [];

  for (const record of records) {
    const coordinates = parseRecordCoordinates(record);
    if (!coordinates) continue;

    const [lng, lat] = coordinates;
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
      properties: {
        id: record.id,
        position_name: record.position_name,
        company_name: record.company_name,
        company_logo_url: record.company_logo_url,
        location: record.location,
        quota: record.quota ?? 0,
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
    stats: {
      total_points: features.length,
      filtered_count: records.length,
    },
  };
}

export function queryListings(records: ListingRecord[], filters: FilterState): ListingsResponse {
  const filtered = filterRecords(records, filters);
  const sorted = sortRecords(filtered, filters.sort_by, filters.order);
  const page = Math.max(1, Number.parseInt(filters.page || "1", 10) || 1);
  const perPage = Math.min(100, Math.max(1, Number.parseInt(filters.per_page || "20", 10) || 20));
  const total = sorted.length;
  const start = (page - 1) * perPage;
  const pageRecords = sorted.slice(start, start + perPage);

  return {
    data: pageRecords,
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
    },
    stats: buildStats(filtered),
  };
}

export function queryMapCompanies(records: ListingRecord[], filters: FilterState): MapCompaniesResponse {
  return buildMapCompanies(filterRecords(records, filters));
}

export function queryCompanyListings(
  records: ListingRecord[],
  company: string,
  scope: { location?: string; latitude?: number; longitude?: number } | undefined,
  filters: FilterState,
): CompanyListingsResponse {
  const filtered = filterRecords(records, filters);
  let targetCoordinates: [number, number] | null = null;
  if (scope?.latitude != null && scope?.longitude != null) {
    targetCoordinates = roundCoordinate(scope.longitude, scope.latitude);
  }

  let normalizedLocation: string | null = null;
  if (scope?.location != null) {
    normalizedLocation = normalizeLocation(scope.location);
    if (normalizedLocation === "Indonesia" && !scope.location.trim()) {
      normalizedLocation = null;
    }
  }

  const listings = filtered.filter((record) => {
    if (record.company_name !== company) return false;

    if (normalizedLocation != null) {
      return normalizeLocation(record.location) === normalizedLocation;
    }

    if (targetCoordinates) {
      const recordCoordinates = parseRecordCoordinates(record);
      if (!recordCoordinates) return false;
      return coordinatesMatch(recordCoordinates, targetCoordinates);
    }

    return true;
  });

  const sorted = sortRecords(listings, "published_at", "desc");
  if (sorted.length === 0) {
    throw new Error("Company not found");
  }

  const sample = sorted[0];
  const sampleCoordinates = parseRecordCoordinates(sample);

  return {
    company: {
      company_name: company,
      company_logo_url: sample.company_logo_url,
      company_email: sample.company_email,
      company_phone: sample.company_phone,
      location: normalizedLocation ?? normalizeLocation(sample.location),
      latitude: targetCoordinates?.[1] ?? sampleCoordinates?.[1],
      longitude: targetCoordinates?.[0] ?? sampleCoordinates?.[0],
      position_count: sorted.length,
      total_quota: sorted.reduce((sum, item) => sum + (item.quota ?? 0), 0),
    },
    count: sorted.length,
    data: sorted,
  };
}

export function exportFilteredRecords(records: ListingRecord[], filters: FilterState, format: "csv" | "json"): void {
  const filtered = sortRecords(filterRecords(records, filters), filters.sort_by, filters.order);

  if (format === "json") {
    const payload = {
      exported_at: new Date().toISOString(),
      count: filtered.length,
      data: filtered,
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "filtered-lowongan.json");
    return;
  }

  const fieldnames = [
    "id",
    "position_name",
    "detail_url",
    "company_name",
    "company_email",
    "company_phone",
    "location",
    "quota",
    "education_levels",
    "study_programs",
    "working_days_per_week",
    "days_off",
    "published_at",
    "task_description",
  ];

  const lines = [fieldnames.join(",")];
  for (const record of filtered) {
    const row = [
      record.id,
      record.position_name,
      record.detail_url,
      record.company_name,
      record.company_email,
      record.company_phone,
      record.location,
      String(record.quota ?? ""),
      (record.education_levels ?? []).join(", "),
      (record.study_programs ?? []).join(", "),
      String(record.working_days_per_week ?? ""),
      (record.days_off ?? []).join(", "),
      record.published_at,
      record.task_description,
    ].map(csvEscape);
    lines.push(row.join(","));
  }

  downloadBlob(new Blob([lines.join("\n")], { type: "text/csv" }), "filtered-lowongan.csv");
}

function csvEscape(value: string | null | undefined): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function isFilterableField(field: string): boolean {
  return !FILTER_EXCLUDED_FIELDS.has(field) && !(field in FILTER_FIELD_ALIASES);
}

export type StaticListingsPayload = {
  generated_at: string;
  source_path: string;
  count: number;
  data: ListingRecord[];
};

export type StaticDataset = {
  meta: MetaResponse;
  records: ListingRecord[];
  recordsById: Map<string, ListingRecord>;
};

function dedupeRecordsById(records: ListingRecord[]): ListingRecord[] {
  const seen = new Set<string>();
  const deduped: ListingRecord[] = [];

  for (const record of records) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    deduped.push(record);
  }

  return deduped;
}

export function buildStaticDataset(meta: MetaResponse, payload: StaticListingsPayload): StaticDataset {
  const records = dedupeRecordsById(payload.data);
  const recordsById = new Map<string, ListingRecord>();
  for (const record of records) {
    recordsById.set(record.id, record);
  }
  return {
    meta: {
      ...meta,
      loaded_records: records.length,
    },
    records,
    recordsById,
  };
}
