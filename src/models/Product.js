import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    price: Number,
    originalPrice: Number,
    category: String,
    dietCompatible: [String],
    image: String,
    inStock: Boolean,
    stockQuantity: Number,
    unit: String,
    rating: Number,
    reviews: Number,
    supplier: String,
    tags: [String],
  },
  { timestamps: true }
);

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;
