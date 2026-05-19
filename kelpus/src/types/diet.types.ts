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
  dietRecords: DietRecord[];
  profileId: string;
  date: string;
}

export interface DietAnalysisResult {
  id: string;
  date: string;
  calorieBalance: number;
  nutritionScore: number;
  suggestions: string[];
  nutrients: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  createdAt: string;
}
