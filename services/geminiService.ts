import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Recipe } from "../types";

const RECIPE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "The name of the recipe" },
    description: { type: Type.STRING, description: "A brief description or summary" },
    servings: { type: Type.NUMBER, description: "Number of servings" },
    prep_time_minutes: { type: Type.NUMBER, description: "Preparation time in minutes (estimate if missing)" },
    cook_time_minutes: { type: Type.NUMBER, description: "Cooking time in minutes (estimate if missing)" },
    ingredients: {
      type: Type.ARRAY,
      description: "List of ingredients",
      items: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.STRING, description: "Numeric amount (e.g. '1.5', '1/2')" },
          unit: { type: Type.STRING, description: "Unit of measure (e.g. 'cup', 'tbsp', 'g')" },
          name: { type: Type.STRING, description: "Name of the ingredient" },
          note: { type: Type.STRING, description: "Any processing notes (e.g., 'chopped', 'to taste')" },
        },
        required: ["name"],
      },
    },
    steps: {
      type: Type.ARRAY,
      description: "List of cooking steps",
      items: {
        type: Type.OBJECT,
        properties: {
          instruction: { type: Type.STRING, description: "The text instruction for this step" },
        },
      },
    },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Tags or categories (e.g. 'Dinner', 'Vegan', 'Italian')",
    },
  },
  required: ["name", "ingredients", "steps"],
};

/**
 * Extracts recipe data.
 * @param data - Base64 string for images/pdf OR raw text string for txt/docx
 * @param mimeType - Mime type of the file. If 'text/plain', data is treated as raw text.
 */
export const extractRecipeFromImage = async (
  data: string,
  mimeType: string,
): Promise<Recipe> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing in environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Extract the recipe details from the provided content.
      
      CRITICAL INSTRUCTIONS:
      1. Keep the output in the ORIGINAL LANGUAGE of the source document. Do NOT translate.
      2. If ingredients are listed, separate amount, unit, and name clearly.
      3. If steps are numbered, keep the order.
      4. If inputs are messy (e.g. OCR text), correct typos but maintain the original language terms.
    `;

    let parts = [];

    // If it's a text-based format (txt, docx converted to text), pass as text part
    if (mimeType === 'text/plain') {
        parts = [
            { text: `[START OF RECIPE DOCUMENT]\n${data}\n[END OF RECIPE DOCUMENT]` },
            { text: prompt }
        ];
    } else {
        // Image or PDF
        parts = [
            {
              inlineData: {
                data: data,
                mimeType: mimeType,
              },
            },
            { text: prompt },
          ];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: RECIPE_SCHEMA,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as Recipe;
    }
    throw new Error("No JSON response generated.");
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};