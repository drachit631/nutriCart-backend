const express = require("express");
const { body, validationResult } = require("express-validator");
const Subscription = require("../models/Subscription");
const { auth } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/subscriptions
// @desc    Create new subscription
// @access  Private
router.post(
  "/",
  auth,
  [
    body("plan").isIn(["monthly", "bi-weekly", "weekly"]),
    body("items").isArray({ min: 1 }),
    body("shippingAddress").isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { plan, items, shippingAddress, deliveryInstructions } = req.body;

      // Calculate frequency based on plan
      const frequencyMap = {
        weekly: 7,
        "bi-weekly": 14,
        monthly: 30,
      };

      const frequency = frequencyMap[plan];
      const startDate = new Date();
      const nextOrderDate = new Date(startDate);
      nextOrderDate.setDate(nextOrderDate.getDate() + frequency);

      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => {
        return sum + item.quantity * item.unitPrice;
      }, 0);

      const subscription = new Subscription({
        user: req.user._id,
        plan,
        frequency,
        startDate,
        nextOrderDate,
        items,
        totalAmount,
        shippingAddress,
        deliveryInstructions,
      });

      await subscription.save();

      res.status(201).json({
        message: "Subscription created successfully",
        subscription: {
          id: subscription._id,
          plan: subscription.plan,
          nextOrderDate: subscription.nextOrderDate,
          totalAmount: subscription.totalAmount,
        },
      });
    } catch (error) {
      console.error("Create subscription error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/subscriptions
// @desc    Get user's subscriptions
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user: req.user._id })
      .populate("items.product", "name images category")
      .sort({ createdAt: -1 });

    res.json({ subscriptions });
  } catch (error) {
    console.error("Get subscriptions error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/subscriptions/:id
// @desc    Get subscription by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("items.product", "name images category description");

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    res.json({ subscription });
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/subscriptions/:id/pause
// @desc    Pause subscription
// @access  Private
router.put(
  "/:id/pause",
  auth,
  [
    body("reason").optional().isString(),
    body("pauseEndDate").optional().isISO8601(),
  ],
  async (req, res) => {
    try {
      const { reason, pauseEndDate } = req.body;

      const subscription = await Subscription.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      if (subscription.status !== "active") {
        return res.status(400).json({ message: "Subscription is not active" });
      }

      subscription.pause(reason, pauseEndDate ? new Date(pauseEndDate) : null);
      await subscription.save();

      res.json({
        message: "Subscription paused successfully",
        subscription: {
          id: subscription._id,
          status: subscription.status,
          pauseStartDate: subscription.pauseStartDate,
          pauseEndDate: subscription.pauseEndDate,
        },
      });
    } catch (error) {
      console.error("Pause subscription error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/subscriptions/:id/resume
// @desc    Resume subscription
// @access  Private
router.put("/:id/resume", auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    if (subscription.status !== "paused") {
      return res.status(400).json({ message: "Subscription is not paused" });
    }

    subscription.resume();
    await subscription.save();

    res.json({
      message: "Subscription resumed successfully",
      subscription: {
        id: subscription._id,
        status: subscription.status,
        nextOrderDate: subscription.nextOrderDate,
      },
    });
  } catch (error) {
    console.error("Resume subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/subscriptions/:id/cancel
// @desc    Cancel subscription
// @access  Private
router.put(
  "/:id/cancel",
  auth,
  [body("reason").optional().isString()],
  async (req, res) => {
    try {
      const { reason } = req.body;

      const subscription = await Subscription.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      if (subscription.status === "cancelled") {
        return res
          .status(400)
          .json({ message: "Subscription is already cancelled" });
      }

      subscription.cancel(reason);
      await subscription.save();

      res.json({
        message: "Subscription cancelled successfully",
        subscription: {
          id: subscription._id,
          status: subscription.status,
          cancelledAt: subscription.cancelledAt,
        },
      });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/subscriptions/:id/update-items
// @desc    Update subscription items
// @access  Private
router.put(
  "/:id/update-items",
  auth,
  [body("items").isArray({ min: 1 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { items } = req.body;

      const subscription = await Subscription.findOne({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      if (subscription.status !== "active") {
        return res
          .status(400)
          .json({ message: "Cannot update inactive subscription" });
      }

      // Calculate new total amount
      const totalAmount = items.reduce((sum, item) => {
        return sum + item.quantity * item.unitPrice;
      }, 0);

      subscription.items = items;
      subscription.totalAmount = totalAmount;
      await subscription.save();

      res.json({
        message: "Subscription items updated successfully",
        subscription: {
          id: subscription._id,
          items: subscription.items,
          totalAmount: subscription.totalAmount,
        },
      });
    } catch (error) {
      console.error("Update subscription items error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
