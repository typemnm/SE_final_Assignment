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
  health_connect_export_status?: DietHealthConnectExportStatus;
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

export type DietHealthConnectExportStatus =
  | 'not_exported'
  | 'exported'
  | 'permission_required'
  | 'unavailable'
  | 'failed'
  | 'deleted';

export interface DietHealthConnectExportStatusUpdateRequest {
  client_record_id: string;
  record_id?: string | null;
  record_version?: number | null;
  status: DietHealthConnectExportStatus;
  exported_at?: string | null;
  last_error?: string | null;
}

export interface DietHealthConnectExportStatusResponse {
  record_id: string;
  health_connect_client_record_id: string | null;
  health_connect_record_id: string | null;
  health_connect_record_version: number | null;
  health_connect_export_status: DietHealthConnectExportStatus;
  health_connect_exported_at: string | null;
  health_connect_last_error: string | null;
}

export interface DietHealthConnectExportableRecord {
  record_id: string;
  analysis_id: string;
  recorded_at: string;
  analyzed_at: string;
  diet_image_url: string | null;
  total_calories: number;
  carb_ratio: number;
  protein_ratio: number;
  fat_ratio: number;
  nutrition_data: {
    calories?: number;
    protein?: number;
    carbohydrate?: number;
    carbohydrates?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    name?: string;
  } | null;
  health_connect_client_record_id: string | null;
  health_connect_record_id: string | null;
  health_connect_record_version: number | null;
  health_connect_export_status: DietHealthConnectExportStatus;
  health_connect_exported_at: string | null;
  health_connect_last_error: string | null;
}

export interface DietDeleteResponse {
  record_id: string;
  deleted: boolean;
  health_connect_client_record_id: string | null;
  health_connect_record_id: string | null;
  health_connect_export_status: DietHealthConnectExportStatus;
}
