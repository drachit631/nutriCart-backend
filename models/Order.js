const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: String, // Store product name at time of order
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    shipping: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["credit-card", "debit-card", "paypal", "apple-pay", "google-pay"],
      required: true,
    },
    shippingAddress: {
      firstName: String,
      lastName: String,
      address: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      phone: String,
    },
    billingAddress: {
      firstName: String,
      lastName: String,
      address: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    deliveryInstructions: String,
    estimatedDelivery: Date,
    actualDelivery: Date,
    trackingNumber: String,
    notes: String,
    isSubscriptionOrder: {
      type: Boolean,
      default: false,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    couponCode: String,
    couponDiscount: {
      type: Number,
      default: 0,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });

// Generate order number before saving
orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.orderNumber = `NC${timestamp.slice(-6)}${random}`;
  }
  next();
});

// Method to calculate totals
orderSchema.methods.calculateTotals = function () {
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.total =
    this.subtotal +
    this.tax +
    this.shipping -
    this.discount -
    this.couponDiscount;
  return this.total;
};

// Method to update order status
orderSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;
  if (newStatus === "delivered") {
    this.actualDelivery = new Date();
  }
  return this;
};

// Method to add tracking
orderSchema.methods.addTracking = function (trackingNumber) {
  this.trackingNumber = trackingNumber;
  return this;
};

// Method to process refund
orderSchema.methods.processRefund = function (amount, reason) {
  this.refundAmount = amount;
  this.refundReason = reason;
  this.status = "refunded";
  this.paymentStatus = "refunded";
  return this;
};

module.exports = mongoose.model("Order", orderSchema);
