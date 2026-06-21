import type { AxiosError } from 'axios';
import adminApiClient from './adminApiClient';

export type StoreRecipeCategory = 'hot' | 'iced' | 'blended' | 'matcha' | 'hojicha' | 'food';

export type AdditionalIngredient = {
  name: string;
  amount: string;
};

export type StoreRecipeSize = {
  label: string;
  coffeeDose?: number;
  waterAmount?: number;
  milkAmount?: number;
  syrupAmount?: number;
  syrupType?: string;
  additionalIngredients: AdditionalIngredient[];
};

export type StoreRecipeCostInfo = {
  ingredientCost?: number;
  sellingPrice?: number;
  margin?: number;
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
};

export type StoreRecipePayload = Omit<StoreRecipe, '_id' | 'createdAt' | 'updatedAt'>;

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
