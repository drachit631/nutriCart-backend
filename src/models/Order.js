import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    productId: String,
    quantity: Number,
    price: Number,
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: String,
    items: [OrderItemSchema],
    total: Number,
    status: { type: String, default: "processing" },
    orderDate: String,
    deliveryDate: String,
    shippingAddress: String,
    paymentMethod: String,
  },
  { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
export default Order;
