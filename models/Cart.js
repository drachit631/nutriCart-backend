const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
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
  totalPrice: {
    type: Number,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  notes: String,
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [cartItemSchema],
    subtotal: {
      type: Number,
      default: 0,
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
      default: 0,
    },
    couponCode: String,
    couponDiscount: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
cartSchema.index({ user: 1, isActive: 1 });

// Method to calculate totals
cartSchema.methods.calculateTotals = function () {
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.total =
    this.subtotal +
    this.tax +
    this.shipping -
    this.discount -
    this.couponDiscount;
  return this.total;
};

// Method to add item to cart
cartSchema.methods.addItem = function (productId, quantity, unitPrice) {
  const existingItem = this.items.find(
    (item) => item.product.toString() === productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.totalPrice = existingItem.quantity * existingItem.unitPrice;
  } else {
    this.items.push({
      product: productId,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
    });
  }

  this.calculateTotals();
  this.lastUpdated = new Date();
  return this;
};

// Method to remove item from cart
cartSchema.methods.removeItem = function (productId) {
  this.items = this.items.filter(
    (item) => item.product.toString() !== productId.toString()
  );
  this.calculateTotals();
  this.lastUpdated = new Date();
  return this;
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function (productId, quantity) {
  const item = this.items.find(
    (item) => item.product.toString() === productId.toString()
  );

  if (item) {
    item.quantity = quantity;
    item.totalPrice = item.quantity * item.unitPrice;
    this.calculateTotals();
    this.lastUpdated = new Date();
  }

  return this;
};

// Method to clear cart
cartSchema.methods.clearCart = function () {
  this.items = [];
  this.subtotal = 0;
  this.tax = 0;
  this.shipping = 0;
  this.discount = 0;
  this.total = 0;
  this.couponCode = null;
  this.couponDiscount = 0;
  this.lastUpdated = new Date();
  return this;
};

module.exports = mongoose.model("Cart", cartSchema);
