// Thresholds and display ranges come from Supabase functions generated from
// the shared categoryRules module. The portal never classifies rounded values.
// This file describes the wire contract only; it does not classify students.
export type CategoryId = "advanced" | "medium" | "needs-improvement";
export type Category = {
  id: CategoryId;
  name: string;
  displayRange: string;
  conditionLabel: string;
};
export type CategoryStats = Category & {
  count: number;
  percentage: number;
  averageCgpa: string | null;
  eligibleCount: number | null;
  eligibilityPercentage: number | null;
};
export type AnalyticsSummary = {
  total: number;
  valid: number;
  missing: number;
  invalid: number;
  unclassified: number;
  averageCgpa: string | null;
  scale: { min: string; max: string };
  placementPolicy: { configured: boolean; minimumCgpa?: string; label?: string };
  categories: CategoryStats[];
  distribution: {
    id: string;
    label: string;
    count: number;
    percentage: number;
  }[];
};
export type AnalyticsOptions = {
  batches: string[];
  departments: string[];
  missing_department: boolean;
};
export type Filters = { batch?: string; department?: string; search?: string };
export type AnalyticsData = {
  summary: AnalyticsSummary;
  options: AnalyticsOptions;
  filters: Filters;
};
export type BatchData = AnalyticsData & {
  batches: ({
    source_batch: string;
    total: number;
    valid: number;
    unclassified: number;
    average: string | null;
  } & Record<CategoryId, number>)[];
};
export type CategoryData = AnalyticsData & {
  category: Category;
  students: {
    id: string;
    enrollment_no: string;
    full_name: string;
    department_short_name: string | null;
    source_batch: string;
    cgpa: string;
    rank: number;
    category_id: CategoryId;
    placement_eligible: boolean | null;
  }[];
  pagination: { total: number; page: number; limit: number };
};
