export interface ListingRecord {
  id: string;
  position_name: string;
  detail_url: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  company_type: string;
  company_logo_url: string;
  location: string;
  address: string;
  latitude: string;
  longitude: string;
  quota: number;
  education_levels: string[];
  study_programs: string[];
  working_days_per_week: number;
  days_off: string[];
  task_description: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  education_levels_label?: string;
  study_programs_label?: string;
  days_off_label?: string;
  bookmarked_at?: string;
  /** Precomputed at load time for fast text search — not persisted in JSON. */
  _search?: string;
}

export interface FilterOptions extends Record<string, string[]> {}

export interface SortOption {
  value: string;
  label: string;
}

export interface MetaResponse {
  source_url: string;
  scraped_at: string;
  total_in_file: number;
  site_total: number;
  loaded_records: number;
  filter_options: FilterOptions;
  sort_options: SortOption[];
}

export interface TopCompanyInsight {
  name: string;
  count: number;
  company_logo_url?: string | null;
}

export interface ListingsStats {
  filtered_count: number;
  unique_companies: number;
  unique_locations: number;
  unique_positions: number;
  total_quota: number;
  avg_quota: number;
  avg_working_days: number;
  mappable_listings: number;
  top_locations: [string, number][];
  top_companies: TopCompanyInsight[];
  top_positions: [string, number][];
  top_education: [string, number][];
  top_company_types: [string, number][];
  top_study_programs: [string, number][];
}

export interface ListingsResponse {
  data: ListingRecord[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  stats: ListingsStats;
}

export interface MapPointProperties {
  id: string;
  position_name: string;
  company_name: string;
  company_logo_url?: string;
  location: string;
  quota: number;
}

export interface CompanyMapProperties {
  marker_id?: string;
  company_name: string;
  company_logo_url?: string;
  company_email?: string;
  company_phone?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  position_count: number;
  total_quota: number;
}

export interface MapCompaniesResponse {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: CompanyMapProperties;
  }>;
  stats: {
    total_locations?: number;
    total_companies: number;
    total_listings?: number;
  };
}

export interface CompanyListingsResponse {
  company: CompanyMapProperties;
  count: number;
  data: ListingRecord[];
}

export interface MapPointsResponse {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: MapPointProperties;
  }>;
  stats: {
    total_points: number;
    filtered_count: number;
  };
}

export interface FilterState {
  q: string;
  fields: Record<string, string[]>;
  quota_min: string;
  quota_max: string;
  working_days_min: string;
  working_days_max: string;
  published_from: string;
  published_to: string;
  sort_by: string;
  order: string;
  per_page: string;
  page: string;
}

export const defaultFilters: FilterState = {
  q: "",
  fields: {},
  quota_min: "",
  quota_max: "",
  working_days_min: "",
  working_days_max: "",
  published_from: "",
  published_to: "",
  sort_by: "published_at",
  order: "desc",
  per_page: "20",
  page: "1",
};
