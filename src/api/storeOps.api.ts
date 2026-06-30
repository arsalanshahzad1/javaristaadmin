import type { AxiosError } from 'axios';
import adminApiClient from './adminApiClient';

export type StoreRecipeCategory = 'hot' | 'iced' | 'blended' | 'matcha' | 'hojicha' | 'food';

export const INGREDIENT_UNITS = ['ml', 'g', 'oz', 'shots', 'pumps', 'leaves', 'scoops', 'pieces', 'tsp', 'tbsp'] as const;
export type IngredientUnit = typeof INGREDIENT_UNITS[number];

export type AdditionalIngredient = {
  name: string;
  amount: string;
};

export type RecipeIngredient = {
  name: string;
  amount: number;
  unit: IngredientUnit;
  isOptional: boolean;
  notes?: string;
};

export type StoreRecipeSize = {
  label: string;
  coffeeDose?: number;
  waterAmount?: number;
  milkAmount?: number;
  syrupAmount?: number;
  syrupType?: string;
  additionalIngredients: AdditionalIngredient[];
  ingredients: RecipeIngredient[];
};

export type StoreRecipeCostInfo = {
  ingredientCost?: number;
  laborCost?: number;
  totalCost?: number;
  sellingPrice?: number;
  margin?: number;
};

export type StoreAverage = {
  storeId: string;
  avgPrepSeconds: number;
  sampleCount: number;
  lastUpdated: string;
};

export type StoreRecipePerformanceData = {
  targetPrepSeconds?: number;
  storeAverages: StoreAverage[];
  companyAvgPrepSeconds?: number;
};

export type QualityPhoto = {
  _id: string;
  type: 'correct' | 'incorrect';
  url: string;
  publicId: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type StoreRecipe = {
  _id: string;
  name: string;
  slug: string;
  category: StoreRecipeCategory;
  sizes: StoreRecipeSize[];
  buildOrder: string[];
  photos: string[];
  videoUrl?: string;
  targetPrepTimeSeconds?: number;
  costInfo: StoreRecipeCostInfo;
  qualityStandards?: string;
  commonMistakes: string[];
  requiredEquipment: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  visibilityRoles?: string[];
  performanceData?: StoreRecipePerformanceData;
  stationAssignment?: string;
  version?: string;
  qualityPhotos: QualityPhoto[];
  certificationRequired: boolean;
  requiredCertifications: string[];
};

export type StoreRecipePayload = Omit<StoreRecipe, '_id' | 'createdAt' | 'updatedAt' | 'qualityPhotos'>;

export type RecipePerformanceResponse = {
  performanceData: StoreRecipePerformanceData;
  targetPrepTimeSeconds?: number;
  top5Fastest: StoreAverage[];
  top5Slowest: StoreAverage[];
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  pagination?: { page: number; limit: number; total: number; pages: number };
};

export function getStoreOpsErrorMessage(error: unknown) {
  return (error as AxiosError<ApiEnvelope<unknown>>).response?.data?.message || 'Something went wrong';
}

export async function getStoreRecipes(params: { search?: string; category?: StoreRecipeCategory }) {
  const response = await adminApiClient.get<ApiEnvelope<StoreRecipe[]>>('/store-ops/recipes', {
    params: { search: params.search || undefined, category: params.category, limit: 50 },
  });
  return response.data;
}

export async function getStoreRecipe(slug: string) {
  const response = await adminApiClient.get<ApiEnvelope<StoreRecipe>>(`/store-ops/recipes/${slug}`);
  return response.data.data;
}

export async function createStoreRecipe(payload: StoreRecipePayload) {
  const response = await adminApiClient.post<ApiEnvelope<StoreRecipe>>('/store-ops/recipes', payload);
  return response.data;
}

export async function updateStoreRecipe(slug: string, payload: Partial<StoreRecipePayload>) {
  const response = await adminApiClient.put<ApiEnvelope<StoreRecipe>>(`/store-ops/recipes/${slug}`, payload);
  return response.data;
}

export async function addQualityPhoto(
  recipeId: string,
  data: { type: 'correct' | 'incorrect'; url: string; publicId: string; caption: string }
) {
  const response = await adminApiClient.post<ApiEnvelope<QualityPhoto[]>>(
    `/store-ops/recipes/${recipeId}/quality-photos`,
    data
  );
  return response.data.data;
}

export async function deleteQualityPhoto(recipeId: string, photoId: string) {
  const response = await adminApiClient.delete<ApiEnvelope<QualityPhoto[]>>(
    `/store-ops/recipes/${recipeId}/quality-photos/${photoId}`
  );
  return response.data.data;
}

export async function getRecipePerformance(recipeId: string) {
  const response = await adminApiClient.get<ApiEnvelope<RecipePerformanceResponse>>(
    `/store-ops/recipes/${recipeId}/performance`
  );
  return response.data.data;
}
