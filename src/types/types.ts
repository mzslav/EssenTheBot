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
  fieldType: FieldType;
  placeholder?: string;
  requiredField: boolean;
  fieldOptions?: {
    values: { option: string }[];
  };
  key: keyof FormData;
}

export type AppScreen = 'welcome' | 'form' | 'results' | 'main' | 'fridge' | 'workout';


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
  reps?: number;
  weight?: number;
  rir?: number;
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
  sets: number;
  reps: string;
  weight: number;
  rir: string;
  notes?: string;
}