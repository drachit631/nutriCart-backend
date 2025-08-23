const express = require("express");
const { auth } = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", auth, async (req, res) => {
  try {
    res.json({
      user: req.user.getPublicProfile(),
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", auth, async (req, res) => {
  try {
    const updateData = {};

    // Only allow updating specific fields
    if (req.body.firstName) updateData.firstName = req.body.firstName;
    if (req.body.lastName) updateData.lastName = req.body.lastName;
    if (req.body.profile)
      updateData.profile = { ...req.user.profile, ...req.body.profile };

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({
      message: "Profile updated successfully",
      user: user.getPublicProfile(),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/users/subscription
// @desc    Get user subscription details
// @access  Private
router.get("/subscription", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("subscription");

    res.json({
      subscription: user.subscription,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/users/subscription
// @desc    Update user subscription
// @access  Private
router.put("/subscription", auth, async (req, res) => {
  try {
    const { autoRenew } = req.body;

    if (typeof autoRenew !== "boolean") {
      return res.status(400).json({ message: "autoRenew must be a boolean" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { "subscription.autoRenew": autoRenew },
      { new: true, runValidators: true }
    ).select("subscription");

    res.json({
      message: "Subscription updated successfully",
      subscription: user.subscription,
    });
  } catch (error) {
    console.error("Update subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
