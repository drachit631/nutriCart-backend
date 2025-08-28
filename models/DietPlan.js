import mongoose from "mongoose";

const DietPlanSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    benefits: [String],
    difficulty: String,
    duration: String,
    color: String,
    icon: String,
    price: Number,
    features: [String],
    sampleMeals: [String],
    restrictions: [String],
    suitableFor: [String],
    weeklyMeals: [
      {
        day: String,
        meals: [
          {
            name: String,
            type: String,
            calories: Number,
          },
        ],
      },
    ],
    groceryList: [String],
    nutritionInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      fiber: Number,
    },
  },
  { timestamps: true }
);

const DietPlan =
  mongoose.models.DietPlan || mongoose.model("DietPlan", DietPlanSchema);
export default DietPlan;
