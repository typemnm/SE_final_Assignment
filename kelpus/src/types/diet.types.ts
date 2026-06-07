export interface DietRecord {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
  totalCalories: number;
  source: 'samsung_health' | 'apple_health' | 'manual';
}

export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  amount: number;
  unit: string;
}

export interface DietAnalysisRequest {
  diet_image_url: string;
  record_id?: string;
}

export interface DietAnalysisResult {
  analysis_id: string;
  record_id: string;
  total_calories: number;
  carb_ratio: number;
  protein_ratio: number;
  fat_ratio: number;
  ai_comment: string | null;
  analyzed_at: string;
  visualization?: DietAnalysisVisualization;
  nutrition_details?: NutritionDetails;
}

export interface DietAnalysisVisualization {
  analysis_id?: string;
  total_calories?: number;
  macros?: {
    carbohydrates?: MacroVisualization;
    protein?: MacroVisualization;
    fat?: MacroVisualization;
  };
  ai_comment?: string | null;
  analyzed_at?: string | null;
}

export interface MacroVisualization {
  ratio: number;
  label: string;
}

export interface NutritionDetails {
  protein?: number;
  carbohydrate?: number;
  carbohydrates?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
}

export interface DietImageUploadResponse {
  diet_image_url: string;
  message: string;
}
