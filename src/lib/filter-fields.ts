export type FilterOptions = Record<string, string[]>;

export const FILTER_FIELD_ALIASES: Record<string, string> = {
  companies: "company_name",
  locations: "location",
  company_types: "company_type",
};

export const FILTER_RESERVED_PARAMS = new Set([
  "q",
  "quota_min",
  "quota_max",
  "working_days_min",
  "working_days_max",
  "published_from",
  "published_to",
  "sort_by",
  "order",
  "per_page",
  "page",
  ...Object.keys(FILTER_FIELD_ALIASES),
]);

export const RANGE_FILTER_FIELDS = new Set(["quota", "working_days_per_week", "published_at"]);

export const FILTER_FIELD_LABELS: Record<string, string> = {
  position_name: "Position",
  company_name: "Company",
  company_email: "Company Email",
  company_phone: "Company Phone",
  company_address: "Company Address",
  company_type: "Company Type",
  location: "Location",
  address: "Address",
  education_levels: "Education Level",
  study_programs: "Study Program",
  working_days_per_week: "Working Days / Week",
  days_off: "Days Off",
  task_description: "Task Description",
  created_at: "Created At",
  updated_at: "Updated At",
};

export const FILTER_FIELD_ORDER = [
  "position_name",
  "company_name",
  "company_email",
  "company_phone",
  "company_address",
  "company_type",
  "location",
  "address",
  "education_levels",
  "study_programs",
  "days_off",
  "task_description",
  "created_at",
  "updated_at",
];

export function normalizeFilterField(field: string): string {
  return FILTER_FIELD_ALIASES[field] ?? field;
}

export function getFilterFieldLabel(field: string): string {
  const normalized = normalizeFilterField(field);
  if (FILTER_FIELD_LABELS[normalized]) {
    return FILTER_FIELD_LABELS[normalized];
  }

  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getMultiSelectFilterFields(options: FilterOptions): string[] {
  const fields = Object.keys(options).filter((field) => !RANGE_FILTER_FIELDS.has(field));

  return fields.sort((left, right) => {
    const leftIndex = FILTER_FIELD_ORDER.indexOf(left);
    const rightIndex = FILTER_FIELD_ORDER.indexOf(right);

    if (leftIndex !== -1 || rightIndex !== -1) {
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    }

    return getFilterFieldLabel(left).localeCompare(getFilterFieldLabel(right));
  });
}
