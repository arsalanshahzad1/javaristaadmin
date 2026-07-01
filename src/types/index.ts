export interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export interface Lesson {
  _id: string;
  title: string;
  order?: number;
  contentType?: 'video' | 'text' | 'quiz';
  videoUrl?: string;
  body?: string;
  durationSeconds?: number;
  questions?: QuizQuestion[];
}

// Mirrors the backend UserRole enum exactly — do not add values not in the backend model.
export type UserRole =
  | 'owner'
  | 'ceo'
  | 'coo'
  | 'cfo'
  | 'regional_manager'
  | 'area_manager'
  | 'store_manager'
  | 'assistant_manager'
  | 'shift_supervisor'
  | 'barista'
  | 'trainee'
  | 'investor'
  | 'hr_manager'
  | 'marketing_manager';

export const EMPLOYEE_TIER_ROLES: UserRole[] = [
  'store_manager',
  'assistant_manager',
  'shift_supervisor',
  'barista',
  'trainee',
];

export const ADMIN_ROLES: UserRole[] = [
  'owner',
  'ceo',
  'coo',
  'cfo',
  'regional_manager',
  'area_manager',
  'hr_manager',
  'marketing_manager',
];

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  isVerified: boolean;
  isPremium: boolean;
  subscriptionStatus: 'none' | 'active' | 'expired' | 'cancelled';
  storeId?: string;
  regionId?: string;
  department?: string;
  reportingTo?: string;
  promotionReadiness?: 'ready' | 'needs_training' | 'not_evaluated';
  javaRistaScore?: number;
  employeeRoleId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrewMethod {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  ratio?: string;
  brewTimeMins?: number;
  brewTimeSecs?: number;
  grindSize?: string;
  equipment?: string[];
  recipeCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeStep {
  order: number;
  instruction: string;
  duration?: number;
}

export interface Recipe {
  _id: string;
  title: string;
  description?: string;
  brewMethod: BrewMethod | string;
  author: User | string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalTime: number;
  steps: RecipeStep[];
  tags: string[];
  image?: string;
  isPublished: boolean;
  isFeatured: boolean;
  likeCount: number;
  brewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrewLog {
  _id: string;
  user: User | string;
  brewMethod: BrewMethod | string;
  recipe?: Recipe | string;
  coffeeDose: number;
  waterAmount: number;
  brewTime?: number;
  grindSize?: string;
  waterTemp?: number;
  rating?: number;
  notes?: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bean {
  _id: string;
  user: User | string;
  name: string;
  origin?: string;
  roastLevel?: 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark';
  processingMethod?: string;
  flavorNotes?: string[];
  roastDate?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface EspressoShot {
  _id: string;
  user: User | string;
  dose: number;
  yield: number;
  extractionTime: number;
  pressure?: number;
  waterTemp?: number;
  grindSize?: string;
  tasteProfile: 'sour' | 'bitter' | 'balanced' | 'other';
  suggestion: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  _id: string;
  user: User | string;
  plan: string;
  status: 'active' | 'expired' | 'cancelled';
  platform?: string;
  transactionId: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserGrowthData {
  month: string;
  count: number;
}

export interface BrewActivityData {
  date: string;
  count: number;
}

export interface PopularMethodData {
  _id: string;
  name: string;
  count: number;
}

export interface TopRecipeData {
  _id: string;
  title: string;
  brewCount: number;
  likeCount: number;
}

export interface RatingData {
  rating: number;
  count: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalRecipes: number;
  totalBrewLogs: number;
  totalBeans: number;
  totalEspressoShots: number;
  activeSubscriptions: number;
  newUsersThisMonth: number;
  avgRating?: number;
  popularMethods: Array<{ _id: string; name: string; count: number }>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
