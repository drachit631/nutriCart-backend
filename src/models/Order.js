import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const ShippingAddressSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    items: [OrderItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
    },
    shipping: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: "processing",
      enum: ["processing", "confirmed", "shipped", "delivered", "cancelled"],
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    deliveryDate: {
      type: Date,
    },
    shippingAddress: ShippingAddressSchema,
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentDetails: {
      cardNumber: String,
      cardholderName: String,
    },
  },
  { timestamps: true }
);

// Add index for better query performance
OrderSchema.index({ userId: 1, orderDate: -1 });

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
export default Order;
