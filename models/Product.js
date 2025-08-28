const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    category: {
      type: String,
      required: true,
      enum: [
        "proteins",
        "vegetables",
        "fruits",
        "grains",
        "dairy",
        "nuts-seeds",
        "oils",
        "supplements",
        "beverages",
        "snacks",
      ],
    },
    subcategory: String,
    brand: String,
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      enum: ["kg", "g", "lb", "oz", "piece", "pack", "bottle", "can"],
    },
    weight: Number, // in grams
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    minOrderQuantity: {
      type: Number,
      default: 1,
    },
    maxOrderQuantity: Number,
    images: [String],
    nutritionalInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      fiber: Number,
      sugar: Number,
      sodium: Number,
      vitamins: [String],
      minerals: [String],
    },
    dietaryTags: [
      {
        type: String,
        enum: [
          "organic",
          "gluten-free",
          "dairy-free",
          "vegan",
          "vegetarian",
          "keto-friendly",
          "paleo-friendly",
          "low-carb",
          "high-protein",
        ],
      },
    ],
    allergens: [String],
    ingredients: [String],
    storageInstructions: String,
    shelfLife: String,
    origin: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    relatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ name: "text", description: "text" });
productSchema.index({ price: 1 });
productSchema.index({ dietaryTags: 1 });

// Virtual for discounted price
productSchema.virtual("isOnSale").get(function () {
  return this.salePrice && this.salePrice < this.price;
});

// Virtual for final price
productSchema.virtual("finalPrice").get(function () {
  return this.salePrice || this.price;
});

module.exports = mongoose.model("Product", productSchema);
