const express = require("express");
const { body, validationResult } = require("express-validator");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const { auth } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/orders/checkout
// @desc    Create new order from cart
// @access  Private
router.post(
  "/checkout",
  auth,
  [
    body("shippingAddress").isObject(),
    body("billingAddress").isObject(),
    body("paymentMethod").isIn([
      "credit-card",
      "debit-card",
      "paypal",
      "apple-pay",
      "google-pay",
    ]),
    body("deliveryInstructions").optional().isString(),
    body("autoSubscription").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        shippingAddress,
        billingAddress,
        paymentMethod,
        deliveryInstructions,
        autoSubscription = false,
      } = req.body;

      // Get user's cart
      const cart = await Cart.findOne({
        user: req.user._id,
        isActive: true,
      }).populate("items.product", "name price stockQuantity");

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      // Check stock availability
      for (const item of cart.items) {
        if (item.product.stockQuantity < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${item.product.name}`,
          });
        }
      }

      // Create order items
      const orderItems = cart.items.map((item) => ({
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }));

      // Calculate delivery date (3-5 business days)
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 4);

      // Create order
      const order = new Order({
        user: req.user._id,
        items: orderItems,
        subtotal: cart.subtotal,
        tax: cart.tax,
        shipping: cart.shipping,
        discount: cart.discount,
        total: cart.total,
        paymentMethod,
        shippingAddress,
        billingAddress,
        deliveryInstructions,
        estimatedDelivery,
        couponCode: cart.couponCode,
        couponDiscount: cart.couponDiscount,
      });

      await order.save();

      // Clear cart
      cart.clearCart();
      await cart.save();

      // If auto-subscription is enabled, create subscription
      if (autoSubscription) {
        // This would integrate with subscription service
        // For now, just return a message
        console.log("Auto-subscription requested for order:", order._id);
      }

      res.status(201).json({
        message: "Order created successfully",
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          total: order.total,
          estimatedDelivery: order.estimatedDelivery,
          status: order.status,
        },
      });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: "Server error during checkout" });
    }
  }
);

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;

    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate("items.product", "name images category")
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

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("items.product", "name images category description");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.post(
  "/:id/cancel",
  auth,
  [body("reason").optional().isString()],
  async (req, res) => {
    try {
      const { reason } = req.body;

      const order = await Order.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.status !== "pending" && order.status !== "confirmed") {
        return res.status(400).json({
          message: "Order cannot be cancelled at this stage",
        });
      }

      order.status = "cancelled";
      order.notes = reason ? `Cancelled: ${reason}` : "Cancelled by user";
      await order.save();

      res.json({
        message: "Order cancelled successfully",
        order: {
          id: order._id,
          status: order.status,
        },
      });
    } catch (error) {
      console.error("Cancel order error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/orders/tracking/:orderNumber
// @desc    Get order tracking information
// @access  Private
router.get("/tracking/:orderNumber", auth, async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({
      orderNumber,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedDelivery: order.estimatedDelivery,
      actualDelivery: order.actualDelivery,
      trackingNumber: order.trackingNumber,
      shippingAddress: order.shippingAddress,
    });
  } catch (error) {
    console.error("Get tracking error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
