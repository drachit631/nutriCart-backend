import mongoose from "mongoose";

const PartnershipSchema = new mongoose.Schema(
  {
    name: String,
    type: String,
    location: String,
    savings: String,
    products: [String],
    image: String,
    rating: Number,
    delivery: String,
    certification: String,
    contact: String,
    website: String,
  },
  { timestamps: true }
);

const Partnership =
  mongoose.models.Partnership ||
  mongoose.model("Partnership", PartnershipSchema);
export default Partnership;
