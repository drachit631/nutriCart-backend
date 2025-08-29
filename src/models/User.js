import mongoose from "mongoose";

const PreferencesSchema = new mongoose.Schema(
  {
    dietaryRestrictions: [String],
    allergies: [String],
    budget: Number,
    healthGoals: [String],
    preferredDiets: [String],
    weight: Number,
    height: Number,
    activityLevel: String,
    cookingExperience: String,
    monthlyBudget: Number,
    activeDietPlan: { type: mongoose.Schema.Types.ObjectId, ref: "DietPlan" },
    dietPlanStartDate: Date,
    dietPlanGoals: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const SubscriptionSchema = new mongoose.Schema(
  {
    tier: { type: String, enum: ["free", "premium", "pro"], default: "free" },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true },
    paymentId: String,
    features: {
      basicDietPlans: { type: Boolean, default: true },
      basicRecipes: { type: Boolean, default: true },
      progressTracking: { type: Boolean, default: false },
      premiumDietPlans: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      exclusiveRecipes: { type: Boolean, default: false },
      nutritionalAnalysis: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      restaurantRecommendations: { type: Boolean, default: false },
      prioritySupport24x7: { type: Boolean, default: false },
      exclusiveWorkshops: { type: Boolean, default: false },
      proRecipes: { type: Boolean, default: false },
      proDietPlans: { type: Boolean, default: false },
      oneOnOneConsultation: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: { type: String, unique: true, index: true },
    password: String, // For demo only; hash in production
    profileComplete: { type: Boolean, default: false },
    subscription: {
      type: SubscriptionSchema,
      default: () => ({
        tier: "free",
        isActive: true,
        features: {
          basicDietPlans: true,
          basicRecipes: true,
          progressTracking: false,
          premiumDietPlans: false,
          prioritySupport: false,
          exclusiveRecipes: false,
          nutritionalAnalysis: false,
          advancedAnalytics: false,
          restaurantRecommendations: false,
          prioritySupport24x7: false,
          exclusiveWorkshops: false,
          proRecipes: false,
          proDietPlans: false,
          oneOnOneConsultation: false,
        },
      }),
    },
    preferences: { type: PreferencesSchema, default: {} },
    createdAt: { type: String },
    lastLogin: { type: String },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
