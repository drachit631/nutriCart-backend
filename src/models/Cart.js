import mongoose from "mongoose";

const CartItemSchema = new mongoose.Schema(
  {
    productId: String,
    quantity: Number,
    price: Number,
  },
  { _id: false }
);

const CartSchema = new mongoose.Schema(
  {
    userId: String,
    items: { type: [CartItemSchema], default: [] },
    total: { type: Number, default: 0 },
    updatedAt: String,
  },
  { timestamps: true }
);

const Cart = mongoose.models.Cart || mongoose.model("Cart", CartSchema);
export default Cart;
