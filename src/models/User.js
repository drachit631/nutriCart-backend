import mongoose from "mongoose";

const PreferencesSchema = new mongoose.Schema(
  {
    dietaryRestrictions: [String],
    allergies: [String],
    budget: Number,
    healthGoals: [String],
    preferredDiets: [String],
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
    subscription: { type: String, default: "free" },
    preferences: { type: PreferencesSchema, default: {} },
    createdAt: { type: String },
    lastLogin: { type: String },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
