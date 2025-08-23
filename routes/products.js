const express = require("express");
const { body, validationResult } = require("express-validator");
const Product = require("../models/Product");
const { auth, optionalAuth, adminAuth } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filtering and pagination
// @access  Public
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      dietaryTags,
      sortBy = "createdAt",
      sortOrder = "desc",
      limit = 20,
      page = 1,
    } = req.query;

    const filter = { isActive: true };

    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (dietaryTags) {
      filter.dietaryTags = { $in: dietaryTags.split(",") };
    }
    if (search) {
      filter.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const products = await Product.find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort(sortOptions);

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: skip + products.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "relatedProducts",
      "name price images category"
    );

    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    console.error("Get product error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/products/category/:category
// @desc    Get products by category
// @access  Public
router.get("/category/:category", optionalAuth, async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({
      category,
      isActive: true,
    })
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments({ category, isActive: true });

    res.json({
      products,
      category,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: skip + products.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get("/featured", optionalAuth, async (req, res) => {
  try {
    const featuredProducts = await Product.find({
      isFeatured: true,
      isActive: true,
    })
      .limit(8)
      .sort({ rating: -1, createdAt: -1 });

    res.json({ featuredProducts });
  } catch (error) {
    console.error("Get featured products error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/products/search/:query
// @desc    Search products
// @access  Public
router.get("/search/:query", optionalAuth, async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
            { brand: { $regex: query, $options: "i" } },
            { tags: { $in: [new RegExp(query, "i")] } },
          ],
        },
      ],
    })
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
            { brand: { $regex: query, $options: "i" } },
            { tags: { $in: [new RegExp(query, "i")] } },
          ],
        },
      ],
    });

    res.json({
      products,
      query,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: skip + products.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Search products error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/products/:id/review
// @desc    Add product review
// @access  Private
router.post(
  "/:id/review",
  auth,
  [
    body("rating").isInt({ min: 1, max: 5 }),
    body("comment").optional().isLength({ max: 500 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { rating, comment } = req.body;
      const productId = req.params.id;

      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check if user already reviewed this product
      const existingReview = product.reviews.find(
        (review) => review.user.toString() === req.user._id.toString()
      );

      if (existingReview) {
        return res
          .status(400)
          .json({ message: "You have already reviewed this product" });
      }

      // Add review
      product.reviews.push({
        user: req.user._id,
        rating,
        comment: comment || "",
      });

      // Update average rating
      const totalRating = product.reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      product.rating.average = totalRating / product.reviews.length;
      product.rating.count = product.reviews.length;

      await product.save();

      res.json({
        message: "Review added successfully",
        product: {
          id: product._id,
          rating: product.rating,
        },
      });
    } catch (error) {
      console.error("Add review error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/products/categories
// @desc    Get all product categories
// @access  Public
router.get("/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/products/dietary-tags
// @desc    Get all dietary tags
// @access  Public
router.get("/dietary-tags", async (req, res) => {
  try {
    const dietaryTags = await Product.distinct("dietaryTags");
    res.json({ dietaryTags });
  } catch (error) {
    console.error("Get dietary tags error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
