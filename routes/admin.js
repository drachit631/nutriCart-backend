const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Product = require("../models/Product");
const DietPlan = require("../models/DietPlan");
const Order = require("../models/Order");
const { adminAuth } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Admin
router.get("/dashboard", adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalDietPlans = await DietPlan.countDocuments();

    // Recent orders
    const recentOrders = await Order.find()
      .populate("user", "firstName lastName email")
      .limit(5)
      .sort({ createdAt: -1 });

    // Revenue stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrdersRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const monthlyRevenue = recentOrdersRevenue[0]?.total || 0;

    res.json({
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalDietPlans,
        monthlyRevenue,
      },
      recentOrders,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users (admin only)
// @access  Admin
router.get("/users", adminAuth, async (req, res) => {
  try {
    const { limit = 20, page = 1, search } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filter)
      .select("-password")
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: skip + users.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (admin only)
// @access  Admin
router.put(
  "/users/:id",
  adminAuth,
  [
    body("subscription.plan").optional().isIn(["free", "pro", "premium"]),
    body("isAdmin").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { subscription, isAdmin } = req.body;

      const updateData = {};
      if (subscription) updateData.subscription = subscription;
      if (typeof isAdmin === "boolean") updateData.isAdmin = isAdmin;

      const user = await User.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "User updated successfully",
        user,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/admin/orders
// @desc    Get all orders (admin only)
// @access  Admin
router.get("/orders", adminAuth, async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate("user", "firstName lastName email")
      .populate("items.product", "name category")
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: skip + orders.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status (admin only)
// @access  Admin
router.put(
  "/orders/:id/status",
  adminAuth,
  [
    body("status").isIn([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ]),
    body("trackingNumber").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, trackingNumber } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      order.status = status;
      if (trackingNumber) {
        order.trackingNumber = trackingNumber;
      }

      await order.save();

      res.json({
        message: "Order status updated successfully",
        order: {
          id: order._id,
          status: order.status,
          trackingNumber: order.trackingNumber,
        },
      });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/admin/products
// @desc    Get all products (admin only)
// @access  Admin
router.get("/products", adminAuth, async (req, res) => {
  try {
    const { limit = 20, page = 1, category } = req.query;

    const filter = {};
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

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

// @route   POST /api/admin/products
// @desc    Create new product (admin only)
// @access  Admin
router.post(
  "/products",
  adminAuth,
  [
    body("name").notEmpty(),
    body("price").isFloat({ min: 0 }),
    body("category").isIn([
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
    ]),
    body("unit").isIn([
      "kg",
      "g",
      "lb",
      "oz",
      "piece",
      "pack",
      "bottle",
      "can",
    ]),
    body("stockQuantity").isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = new Product(req.body);
      await product.save();

      res.status(201).json({
        message: "Product created successfully",
        product,
      });
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/admin/products/:id
// @desc    Update product (admin only)
// @access  Admin
router.put("/products/:id", adminAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Delete product (admin only)
// @access  Admin
router.delete("/products/:id", adminAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product deleted successfully",
      productId: req.params.id,
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
