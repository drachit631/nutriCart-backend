const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  description: String,
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  fiber: Number,
  ingredients: [String],
  instructions: [String],
});

const daySchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
  },
  meals: [mealSchema],
  totalCalories: Number,
  totalProtein: Number,
  totalCarbs: Number,
  totalFat: Number,
});

const dietPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "keto",
        "vegan",
        "dash",
        "mediterranean",
        "intermittent-fasting",
        "paleo",
        "low-carb",
        "high-protein",
      ],
    },
    description: {
      type: String,
      required: true,
    },
    shortDescription: String,
    benefits: [String],
    restrictions: [String],
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    duration: {
      type: Number, // in weeks
      default: 4,
    },
    targetAudience: [String],
    weeklySchedule: [daySchema],
    dailyCalorieTarget: {
      min: Number,
      max: Number,
    },
    macroRatios: {
      protein: Number, // percentage
      carbs: Number, // percentage
      fat: Number, // percentage
    },
    groceryList: [
      {
        category: String,
        items: [
          {
            name: String,
            quantity: String,
            frequency: String, // daily, weekly, monthly
          },
        ],
      },
    ],
    tips: [String],
    warnings: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
dietPlanSchema.index({ type: 1, difficulty: 1, isActive: 1 });

module.exports = mongoose.model("DietPlan", dietPlanSchema);
