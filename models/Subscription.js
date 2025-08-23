const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: String,
      enum: ["monthly", "bi-weekly", "weekly"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "cancelled", "expired"],
      default: "active",
    },
    startDate: {
      type: Date,
      required: true,
    },
    nextOrderDate: {
      type: Date,
      required: true,
    },
    endDate: Date,
    frequency: {
      type: Number, // days between orders
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        unitPrice: {
          type: Number,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
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
    deliveryInstructions: String,
    autoRenew: {
      type: Boolean,
      default: true,
    },
    maxOrders: Number, // null for unlimited
    currentOrderCount: {
      type: Number,
      default: 0,
    },
    pauseReason: String,
    pauseStartDate: Date,
    pauseEndDate: Date,
    cancellationReason: String,
    cancelledAt: Date,
    lastOrderDate: Date,
    nextOrderNumber: {
      type: String,
      default: "1",
    },
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ nextOrderDate: 1 });
subscriptionSchema.index({ status: 1, nextOrderDate: 1 });

// Calculate next order date based on frequency
subscriptionSchema.methods.calculateNextOrderDate = function () {
  if (this.status === "active" && !this.pauseStartDate) {
    const lastOrder = this.lastOrderDate || this.startDate;
    this.nextOrderDate = new Date(lastOrder);
    this.nextOrderDate.setDate(this.nextOrderDate.getDate() + this.frequency);
  }
  return this.nextOrderDate;
};

// Pause subscription
subscriptionSchema.methods.pause = function (reason, pauseEndDate) {
  this.status = "paused";
  this.pauseReason = reason;
  this.pauseStartDate = new Date();
  this.pauseEndDate = pauseEndDate;
  return this;
};

// Resume subscription
subscriptionSchema.methods.resume = function () {
  this.status = "active";
  this.pauseStartDate = null;
  this.pauseEndDate = null;
  this.pauseReason = null;
  this.calculateNextOrderDate();
  return this;
};

// Cancel subscription
subscriptionSchema.methods.cancel = function (reason) {
  this.status = "cancelled";
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  this.autoRenew = false;
  return this;
};

// Process order and update next order date
subscriptionSchema.methods.processOrder = function () {
  this.currentOrderCount += 1;
  this.lastOrderDate = new Date();
  this.nextOrderNumber = (parseInt(this.nextOrderNumber) + 1).toString();

  // Check if max orders reached
  if (this.maxOrders && this.currentOrderCount >= this.maxOrders) {
    this.status = "expired";
    this.endDate = new Date();
  } else {
    this.calculateNextOrderDate();
  }

  return this;
};

// Check if subscription should be processed
subscriptionSchema.methods.shouldProcessOrder = function () {
  if (this.status !== "active") return false;
  if (
    this.pauseStartDate &&
    this.pauseEndDate &&
    new Date() < this.pauseEndDate
  )
    return false;
  if (this.maxOrders && this.currentOrderCount >= this.maxOrders) return false;

  return new Date() >= this.nextOrderDate;
};

module.exports = mongoose.model("Subscription", subscriptionSchema);
