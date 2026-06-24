export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface FormData {
  gender?: string;
  age?: number;
  weight?: number;
  height?: number;
  goal?: string;
  activity?: string;
  notifications?: string;
}

export type FieldType = 'radio' | 'dropdown' | 'number';

export interface Question {
  fieldLabel: string;
  labelKey?: string;
  fieldType: FieldType;
  placeholder?: string;
  placeholderKey?: string;
  requiredField: boolean;
  fieldOptions?: {
    values: { option: string; optionKey?: string }[];
  };
  key: keyof FormData;
}

export type AppScreen = 'welcome' | 'form' | 'results' | 'main' | 'fridge' | 'workout' | 'chat';


export type InputMode = 'photo' | 'voice' | 'text';

export interface RecentItem {
  id: number;
  name: string;
  calories: number;
  time: string;
  type: 'text' | 'voice' | 'photo';
  emoji?: string;
  image?: string;
}

export interface AIResponse {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  clarifyingQuestions: string[];
}

export interface FridgeScreenProps {
  user?: TelegramUser;
  isDark: boolean;
  themeColor?: string;
}


export interface WorkoutPlan {
  id: number;
  user_id: number;
  name: string;
  muscle_group?: string;
  created_at: string;
  updated_at: string;
}

export interface PlanExercise {
  id: number;
  plan_id: number;
  name: string;
  video_url?: string;
  sets: number;
  reps: string;
  weight: number;
  rir: string;
  notes?: string;
  order_index: number;
}

export interface WorkoutSession {
  id: number;
  user_id: number;
  plan_id?: number;
  date: string;
  name: string;
  status: 'planned' | 'in_progress' | 'completed';
  notes?: string;
  created_at: string;
}

export interface SessionExercise {
  id: number;
  session_id: number;
  plan_exercise_id?: number;
  name: string;
  video_url?: string;
  notes?: string;
  order_index: number;
}

export interface SessionSet {
  id: number;
  session_exercise_id: number;
  set_number: number;
  reps?: number | null;
  weight?: number | null;
  rir?: number | null;
  is_completed: boolean;
}

export interface PlanExerciseWithSets extends PlanExercise {
}

export interface WorkoutPlanWithExercises extends WorkoutPlan {
  exercises: PlanExercise[];
}

export interface SessionSetWithPrevious extends SessionSet {
  previous_weight?: number;
  previous_reps?: number;
}

export interface SessionExerciseWithSets extends SessionExercise {
  sets: SessionSetWithPrevious[];
}

export interface SessionWithExercises extends WorkoutSession {
  exercises: SessionExerciseWithSets[];
}

export interface ProgressEntry {
  date: string;
  max_weight: number;
  total_volume: number;
  total_reps: number;
  session_id: number;
}

export interface PlanFormData {
  name: string;
  muscle_group?: string;
}

export interface ExerciseFormData {
  name: string;
  video_url?: string;
  sets: number | '';
  reps: string;
  weight: number | '';
  rir: string;
  notes?: string;
}

export interface UserData {
  id: number;
  telegram_user_id: number;
  first_name: string;
  username?: string;
  gender?: string;
  age?: number;
  weight?: number;
  height?: number;
  goal?: string;
  multiplier: number;
  notification?: boolean;
  notify_water?: boolean;
  notify_meals?: boolean;
  streak_days?: number;
  TDEE_Normal: number;
  TDEE: number;
  protein_Normal: number;
  protein: number;
  fat_Normal: number;
  fat: number;
  carbs_Normal: number;
  carbs: number;
  waterPerDay: number;
  BMI: number;
  BMICategory: string;
}
