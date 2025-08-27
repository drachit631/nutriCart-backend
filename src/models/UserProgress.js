import mongoose from "mongoose";

const MeasurementsSchema = new mongoose.Schema(
  {
    waist: Number,
    chest: Number,
    arms: Number,
  },
  { _id: false }
);

const UserProgressSchema = new mongoose.Schema(
  {
    userId: String,
    dietPlanId: String,
    startDate: String,
    currentWeight: Number,
    targetWeight: Number,
    measurements: MeasurementsSchema,
    progressPhotos: [String],
    notes: String,
  },
  { timestamps: true }
);

const UserProgress =
  mongoose.models.UserProgress ||
  mongoose.model("UserProgress", UserProgressSchema);
export default UserProgress;
