import React, { useState, useEffect } from 'react';
import { Recipe, Ingredient, Step } from '../types';

interface RecipeReviewProps {
  recipe: Recipe;
  onSave: (updatedRecipe: Recipe) => void;
  onCancel: () => void;
}

export const RecipeReview: React.FC<RecipeReviewProps> = ({ recipe, onSave, onCancel }) => {
  const [data, setData] = useState<Recipe>(recipe);

  // Sync state if prop changes
  useEffect(() => {
    setData(recipe);
  }, [recipe]);

  const handleChange = (field: keyof Recipe, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string) => {
    const newIngredients = [...data.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setData(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...data.steps];
    newSteps[index] = { ...newSteps[index], instruction: value };
    setData(prev => ({ ...prev, steps: newSteps }));
  };

  const addIngredient = () => {
    setData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: '', unit: '' }]
    }));
  };

  const addStep = () => {
    setData(prev => ({
      ...prev,
      steps: [...prev.steps, { instruction: '' }]
    }));
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Review & Edit Recipe</h2>
        <div className="flex gap-2">
            <button 
                onClick={onCancel}
                className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
                Cancel
            </button>
            <button 
                onClick={() => onSave(data)}
                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
            >
                Confirm Data
            </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Recipe Name</label>
          <input 
            type="text" 
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            value={data.name} 
            onChange={(e) => handleChange('name', e.target.value)} 
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Description</label>
          <textarea 
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            rows={3}
            value={data.description} 
            onChange={(e) => handleChange('description', e.target.value)} 
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Servings</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
              value={data.servings} 
              onChange={(e) => handleChange('servings', parseInt(e.target.value) || 0)} 
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Prep Time (m)</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
              value={data.prep_time_minutes} 
              onChange={(e) => handleChange('prep_time_minutes', parseInt(e.target.value) || 0)} 
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Cook Time (m)</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
              value={data.cook_time_minutes} 
              onChange={(e) => handleChange('cook_time_minutes', parseInt(e.target.value) || 0)} 
            />
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <label className="block text-lg font-semibold text-slate-200 mb-2">Ingredients</label>
          <div className="space-y-2">
            {data.ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2">
                <input 
                  placeholder="Amt" 
                  className="w-16 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                  value={ing.amount || ''}
                  onChange={(e) => handleIngredientChange(i, 'amount', e.target.value)}
                />
                <input 
                  placeholder="Unit" 
                  className="w-20 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                  value={ing.unit || ''}
                  onChange={(e) => handleIngredientChange(i, 'unit', e.target.value)}
                />
                <input 
                  placeholder="Ingredient Name" 
                  className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                  value={ing.name}
                  onChange={(e) => handleIngredientChange(i, 'name', e.target.value)}
                />
              </div>
            ))}
            <button onClick={addIngredient} className="text-indigo-400 text-sm hover:underline">+ Add Ingredient</button>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <label className="block text-lg font-semibold text-slate-200 mb-2">Instructions</label>
          <div className="space-y-2">
            {data.steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-slate-500 mt-2 text-xs font-mono">{i + 1}.</span>
                <textarea 
                  className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm"
                  rows={2}
                  value={step.instruction}
                  onChange={(e) => handleStepChange(i, e.target.value)}
                />
              </div>
            ))}
            <button onClick={addStep} className="text-indigo-400 text-sm hover:underline">+ Add Step</button>
          </div>
        </div>
      </div>
    </div>
  );
};