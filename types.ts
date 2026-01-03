export interface Ingredient {
  amount: string;
  unit: string;
  name: string;
  note?: string;
}

export interface Step {
  instruction: string;
}

export interface Recipe {
  name: string;
  description: string;
  servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  ingredients: Ingredient[];
  steps: Step[];
  keywords: string[];
  original_file_name?: string;
}

export enum ProcessStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface FileItem {
  id: string;
  file: File;
  preview: string;
  status: ProcessStatus;
  recipe?: Recipe;
  error?: string;
}

export interface TandoorConfig {
  url: string;
  apiKey: string;
}