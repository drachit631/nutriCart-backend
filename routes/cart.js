const express = require("express");
const { body, validationResult } = require("express-validator");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { auth } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({
      user: req.user._id,
      isActive: true,
    }).populate("items.product", "name price images category stockQuantity");

    if (!cart) {
      cart = new Cart({ user: req.user._id });
      await cart.save();
    }

    res.json({ cart });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/cart/add
// @desc    Add item to cart
// @access  Private
router.post(
  "/add",
  auth,
  [body("productId").isMongoId(), body("quantity").isInt({ min: 1 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId, quantity } = req.body;

      // Check if product exists and is active
      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check stock availability
      if (product.stockQuantity < quantity) {
        return res.status(400).json({
          message: `Only ${product.stockQuantity} items available in stock`,
        });
      }

      // Get or create cart
      let cart = await Cart.findOne({ user: req.user._id, isActive: true });
      if (!cart) {
        cart = new Cart({ user: req.user._id });
      }

      // Add item to cart
      cart.addItem(productId, quantity, product.finalPrice);
      await cart.save();

      // Populate product details
      await cart.populate(
        "items.product",
        "name price images category stockQuantity"
      );

      res.json({
        message: "Item added to cart successfully",
        cart,
      });
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/cart/update
// @desc    Update item quantity in cart
// @access  Private
router.put(
  "/update",
  auth,
  [body("productId").isMongoId(), body("quantity").isInt({ min: 1 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { productId, quantity } = req.body;

      const cart = await Cart.findOne({ user: req.user._id, isActive: true });
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      // Check if item exists in cart
      const cartItem = cart.items.find(
        (item) => item.product.toString() === productId
      );

      if (!cartItem) {
        return res.status(404).json({ message: "Item not found in cart" });
      }

      // Check stock availability
      const product = await Product.findById(productId);
      if (product.stockQuantity < quantity) {
        return res.status(400).json({
          message: `Only ${product.stockQuantity} items available in stock`,
        });
      }

      // Update quantity
      cart.updateItemQuantity(productId, quantity);
      await cart.save();

      // Populate product details
      await cart.populate(
        "items.product",
        "name price images category stockQuantity"
      );

      res.json({
        message: "Cart updated successfully",
        cart,
      });
    } catch (error) {
      console.error("Update cart error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   DELETE /api/cart/remove/:productId
// @desc    Remove item from cart
// @access  Private
router.delete("/remove/:productId", auth, async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Remove item
    cart.removeItem(productId);
    await cart.save();

    // Populate product details
    await cart.populate(
      "items.product",
      "name price images category stockQuantity"
    );

    res.json({
      message: "Item removed from cart successfully",
      cart,
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/cart/clear
// @desc    Clear user's cart
// @access  Private
router.post("/clear", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.clearCart();
    await cart.save();

    res.json({
      message: "Cart cleared successfully",
      cart,
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/cart/apply-coupon
// @desc    Apply coupon code to cart
// @access  Private
router.post(
  "/apply-coupon",
  auth,
  [body("couponCode").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { couponCode } = req.body;

      const cart = await Cart.findOne({ user: req.user._id, isActive: true });
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      // Mock coupon validation - in real app, would check against coupon database
      if (couponCode.toUpperCase() === "WELCOME10") {
        cart.couponCode = couponCode;
        cart.couponDiscount = cart.subtotal * 0.1; // 10% discount
        cart.calculateTotals();
        await cart.save();

        await cart.populate(
          "items.product",
          "name price images category stockQuantity"
        );

        res.json({
          message: "Coupon applied successfully",
          cart,
        });
      } else {
        res.status(400).json({ message: "Invalid coupon code" });
      }
    } catch (error) {
      console.error("Apply coupon error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   POST /api/cart/remove-coupon
// @desc    Remove coupon from cart
// @access  Private
router.post("/remove-coupon", auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, isActive: true });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.couponCode = null;
    cart.couponDiscount = 0;
    cart.calculateTotals();
    await cart.save();

    await cart.populate(
      "items.product",
      "name price images category stockQuantity"
    );

    res.json({
      message: "Coupon removed successfully",
      cart,
    });
  } catch (error) {
    console.error("Remove coupon error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
