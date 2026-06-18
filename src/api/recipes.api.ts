import api from './axios';
import type { ApiResponse, PaginatedResponse, Recipe, RecipeStep } from '../types';

interface GetRecipesParams {
  page?: number;
  limit?: number;
  search?: string;
  brewMethod?: string;
  isPublished?: boolean;
}

interface RecipePayload {
  title: string;
  description?: string;
  brewMethod: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalTime: number;
  steps: RecipeStep[];
  tags?: string[];
}

export const recipesApi = {
  getRecipes: (params?: GetRecipesParams) =>
    api.get<PaginatedResponse<Recipe>>('/admin/recipes', { params }),

  getRecipeById: (id: string) =>
    api.get<ApiResponse<Recipe>>(`/recipes/${id}`),

  createRecipe: (data: RecipePayload) =>
    api.post<ApiResponse<Recipe>>('/recipes', data),

  updateRecipe: (id: string, data: Partial<RecipePayload>) =>
    api.put<ApiResponse<Recipe>>(`/recipes/${id}`, data),

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
