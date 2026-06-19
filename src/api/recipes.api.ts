import api from './axios';
import type { ApiResponse, PaginatedResponse, Recipe, RecipeStep } from '../types';

interface GetRecipesParams {
  page?: number;
  limit?: number;
  search?: string;
  brewMethod?: string;
  isPublished?: boolean;
}

interface RecipeFormPayload {
  title: string;
  description?: string;
  brewMethod: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalTime: number;
  steps: RecipeStep[];
  tags?: string[];
  coffeeDose?: number;
  waterAmount?: number;
  grindSize?: string;
  image?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  isPremium?: boolean;
}

type BackendDifficulty = 'easy' | 'medium' | 'hard';

function mapDifficulty(difficulty: RecipeFormPayload['difficulty']): BackendDifficulty {
  if (difficulty === 'beginner') return 'easy';
  if (difficulty === 'intermediate') return 'medium';
  return 'hard';
}

function mapSteps(steps: RecipeStep[] = []) {
  return steps.map((step, index) => ({
    stepNumber: step.order ?? index + 1,
    title: `Step ${step.order ?? index + 1}`,
    description: step.instruction,
    timerSeconds: step.duration,
  }));
}

function mapRecipePayload(data: Partial<RecipeFormPayload>) {
  const mapped: Record<string, unknown> = {
    name: data.title ?? '',
    description: data.description ?? '',
    brewMethod: data.brewMethod ?? '',
    difficulty: mapDifficulty((data.difficulty ?? 'advanced') as RecipeFormPayload['difficulty']),
    brewTime: data.totalTime ?? 0,
    steps: mapSteps(data.steps),
    tags: data.tags ?? [],
    image: data.image,
    isPremium: data.isPremium ?? false,
  };

  if (data.coffeeDose !== undefined) mapped.coffeeDose = data.coffeeDose;
  if (data.waterAmount !== undefined) mapped.waterAmount = data.waterAmount;
  if (data.grindSize !== undefined) mapped.grindSize = data.grindSize;

  return mapped;
}

export const recipesApi = {
  getRecipes: (params?: GetRecipesParams) =>
    api.get<PaginatedResponse<Recipe>>('/admin/recipes', { params }),

  getRecipeById: (id: string) =>
    api.get<ApiResponse<Recipe>>(`/recipes/${id}`),

  createRecipe: (data: RecipeFormPayload) =>
    api.post<ApiResponse<Recipe>>('/recipes', mapRecipePayload(data)),

  updateRecipe: (id: string, data: Partial<RecipeFormPayload>) =>
    api.put<ApiResponse<Recipe>>(`/recipes/${id}`, mapRecipePayload(data)),

  deleteRecipe: (id: string) =>
    api.delete<ApiResponse<void>>(`/admin/recipes/${id}`),

  publishRecipe: (id: string, isPublished: boolean, isFeatured: boolean) =>
    api.put<ApiResponse<Recipe>>(`/admin/recipes/${id}/publish`, { isPublished, isFeatured }),

  uploadRecipeImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post<ApiResponse<Recipe>>(`/recipes/${id}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** @deprecated use getRecipes */
  getAll: (params?: GetRecipesParams) =>
    api.get<PaginatedResponse<Recipe>>('/admin/recipes', { params }),

  /** @deprecated use publishRecipe */
  publish: (id: string, data: { isPublished: boolean; isFeatured: boolean }) =>
    api.put<ApiResponse<Recipe>>(`/admin/recipes/${id}/publish`, data),

  /** @deprecated use deleteRecipe */
  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/admin/recipes/${id}`),
};
