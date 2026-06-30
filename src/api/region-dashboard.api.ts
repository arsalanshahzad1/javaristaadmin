import adminApiClient from './adminApiClient';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RegionOverview {
  regionId: string;
  storeCount: number;
  totalEmployees: number;
  avgJavaRistaScore: number;
  topStore: { storeId: string; name: string; avgScore: number } | null;
  bottomStore: { storeId: string; name: string; avgScore: number } | null;
  checklistComplianceRate: number;
  learningPathCompletionRate: number;
  activeCertifications: number;
  pendingRoleRequests: number;
}

export interface StoreBreakdownRow {
  storeId: string;
  storeName: string;
  storeType: string;
  employeeCount: number;
  avgJavaRistaScore: number | null;
  checklistComplianceRate: number;
  learningCompletionRate: number;
  activeCerts: number;
  pendingRoleRequests: number;
}

export interface TrendPoint {
  date: string;
  avgScore: number;
  checklistCompliance: number;
  learningCompletions: number;
}

export interface TopPerformer {
  userId: string;
  name: string;
  role: string;
  storeId: string;
  storeName: string;
  javaRistaScore: number;
  completedPaths: number;
  activeCerts: number;
}

type Envelope<T> = { success: boolean; message: string; data: T };

// ── API functions ──────────────────────────────────────────────────────────

/**
 * Returns the list of all region IDs available to the current admin.
 */
export async function getRegions(): Promise<string[]> {
  const res = await adminApiClient.get<Envelope<string[]>>('/api/regions');
  return res.data.data;
}

/**
 * Returns high-level KPI overview for a region.
 * @param regionId - The region identifier.
 * @param from - ISO date string for the start of the range (optional).
 * @param to - ISO date string for the end of the range (optional).
 */
export async function getRegionOverview(
  regionId: string,
  from?: string,
  to?: string,
): Promise<RegionOverview> {
  const res = await adminApiClient.get<Envelope<RegionOverview>>(
    `/api/regions/${regionId}/overview`,
    { params: { from, to } },
  );
  return res.data.data;
}

/**
 * Returns per-store metric rows for a region.
 * @param regionId - The region identifier.
 * @param from - ISO date string for the start of the range (optional).
 * @param to - ISO date string for the end of the range (optional).
 */
export async function getRegionStores(
  regionId: string,
  from?: string,
  to?: string,
): Promise<StoreBreakdownRow[]> {
  const res = await adminApiClient.get<Envelope<StoreBreakdownRow[]>>(
    `/api/regions/${regionId}/stores`,
    { params: { from, to } },
  );
  return res.data.data;
}

/**
 * Returns day-by-day trend data for a region.
 * @param regionId - The region identifier.
 * @param from - ISO date string for the start of the range (optional).
 * @param to - ISO date string for the end of the range (optional).
 */
export async function getRegionTrend(
  regionId: string,
  from?: string,
  to?: string,
): Promise<TrendPoint[]> {
  const res = await adminApiClient.get<Envelope<TrendPoint[]>>(
    `/api/regions/${regionId}/trend`,
    { params: { from, to } },
  );
  return res.data.data;
}

/**
 * Returns top-performing employees in a region.
 * @param regionId - The region identifier.
 * @param limit - Maximum number of results to return (default 10).
 */
export async function getRegionTopPerformers(
  regionId: string,
  limit = 10,
): Promise<TopPerformer[]> {
  const res = await adminApiClient.get<Envelope<TopPerformer[]>>(
    `/api/regions/${regionId}/top-performers`,
    { params: { limit } },
  );
  return res.data.data;
}
