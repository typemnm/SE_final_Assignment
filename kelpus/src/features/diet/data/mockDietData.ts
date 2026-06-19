import type {DietAnalysisResult, DietRecord} from '@appTypes/diet.types';

const today = new Date().toISOString().slice(0, 10);
const ts = (hh: number, mm = 0) =>
  new Date(`${today}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+09:00`).toISOString();

export const MOCK_DIET_RECORDS: DietRecord[] = [
  {
    id: 'mock-dinner-001',
    date: ts(19, 30),
    mealType: 'dinner',
    totalCalories: 628,
    source: 'manual',
    items: [
      {name: '삼겹살', calories: 350, protein: 22, carbs: 0,  fat: 30, amount: 120, unit: 'g'},
      {name: '쌈채소',  calories: 30,  protein: 2,  carbs: 5,  fat: 0,  amount: 100, unit: 'g'},
      {name: '흰쌀밥',  calories: 225, protein: 4,  carbs: 49, fat: 0,  amount: 150, unit: 'g'},
      {name: '된장',    calories: 23,  protein: 2,  carbs: 2,  fat: 1,  amount: 30,  unit: 'g'},
    ],
  },
  {
    id: 'mock-lunch-001',
    date: ts(12, 30),
    mealType: 'lunch',
    totalCalories: 756,
    source: 'manual',
    items: [
      {name: '제육볶음', calories: 320, protein: 28, carbs: 12, fat: 18, amount: 150, unit: 'g'},
      {name: '흰쌀밥',   calories: 300, protein: 5,  carbs: 65, fat: 1,  amount: 200, unit: 'g'},
      {name: '배추김치', calories: 20,  protein: 1,  carbs: 4,  fat: 0,  amount: 50,  unit: 'g'},
      {name: '된장국',   calories: 60,  protein: 4,  carbs: 6,  fat: 2,  amount: 200, unit: 'ml'},
      {name: '두부조림', calories: 56,  protein: 5,  carbs: 3,  fat: 3,  amount: 100, unit: 'g'},
    ],
  },
  {
    id: 'mock-breakfast-001',
    date: ts(8, 0),
    mealType: 'breakfast',
    totalCalories: 422,
    source: 'manual',
    items: [
      {name: '현미밥',   calories: 278, protein: 5,  carbs: 58, fat: 2,  amount: 180, unit: 'g'},
      {name: '된장찌개', calories: 88,  protein: 6,  carbs: 8,  fat: 3,  amount: 200, unit: 'ml'},
      {name: '달걀프라이', calories: 92, protein: 6, carbs: 0,  fat: 7,  amount: 60,  unit: 'g'},
      {name: '배추김치', calories: 20,  protein: 1,  carbs: 4,  fat: 0,  amount: 50,  unit: 'g'},
    ],
  },
  {
    id: 'mock-snack-001',
    date: ts(15, 30),
    mealType: 'snack',
    totalCalories: 135,
    source: 'manual',
    items: [
      {name: '사과',     calories: 95, protein: 0, carbs: 25, fat: 0, amount: 200, unit: 'g'},
      {name: '아메리카노', calories: 10, protein: 0, carbs: 2, fat: 0, amount: 350, unit: 'ml'},
      {name: '아몬드',   calories: 30, protein: 1, carbs: 1,  fat: 3, amount: 10,  unit: 'g'},
    ],
  },
];

// total_calories: 628 + 756 + 422 + 135 = 1941
export const MOCK_DIET_ANALYSIS: DietAnalysisResult = {
  analysis_id: 'mock-analysis-today',
  record_id:   'mock-record-today',
  total_calories: 1941,
  carb_ratio:     0.47,
  protein_ratio:  0.17,
  fat_ratio:      0.30,
  ai_comment:
    '오늘 단백질 섭취가 충분합니다! 저녁 삼겹살의 포화지방이 높으니 내일은 닭가슴살이나 생선으로 대체해 보세요. 탄수화물 비율이 이상적인 범위 안에 있어요.',
  analyzed_at: ts(19, 45),
  nutrition_details: {
    carbohydrate: 228,
    protein:      82,
    fat:          64,
    fiber:        14,
    sugar:        38,
  },
};
