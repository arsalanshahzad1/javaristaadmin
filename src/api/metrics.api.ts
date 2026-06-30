import adminApiClient from './adminApiClient';

export interface StoreReadiness {
  storeId: string;
  storeName: string;
  readinessPercent: number;
  employeeCount: number;
}

export interface DashboardMetrics {
  trainingCompliance: {
    percent: number;
    completed: number;
    total: number;
  };
  manualCompliance: {
    percent: number;
    read: number;
    total: number;
  };
  avgJavaRistaScore: number;
  totalEmployees: number;
  activeCoursesCount: number;
  certificationIssuedCount: number;
  storeReadiness: StoreReadiness[];
}

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await adminApiClient.get<ApiEnvelope<DashboardMetrics>>('/metrics/dashboard');
  return response.data.data;
}
