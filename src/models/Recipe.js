import mongoose from "mongoose";

const IngredientSchema = new mongoose.Schema(
  {
    name: String,
    quantity: String,
    inPantry: Boolean,
    productId: String,
  },
  { _id: false }
);

const NutritionSchema = new mongoose.Schema(
  {
    calories: Number,
    protein: String,
    fat: String,
    carbs: String,
    fiber: String,
  },
  { _id: false }
);

const RecipeSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    difficulty: String,
    time: String,
    servings: Number,
    calories: Number,
    image: String,
    tags: [String],
    ingredients: [IngredientSchema],
    instructions: [String],
    nutrition: NutritionSchema,
    dietCompatible: [String],
    author: String,
    rating: Number,
    reviews: Number,
  },
  { timestamps: true }
);

const Recipe = mongoose.models.Recipe || mongoose.model("Recipe", RecipeSchema);
export default Recipe;
