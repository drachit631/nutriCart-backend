const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("firstName").trim().notEmpty(),
    body("lastName").trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, profile } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
      }

      // Create new user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        profile: profile || {},
      });

      await user.save();

      // Generate token
      const token = generateToken(user._id);

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: user.getPublicProfile(),
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error during registration" });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = generateToken(user._id);

      res.json({
        message: "Login successful",
        token,
        user: user.getPublicProfile(),
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error during login" });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get("/me", auth, async (req, res) => {
  try {
    res.json({
      user: req.user.getPublicProfile(),
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  auth,
  [
    body("firstName").optional().trim().notEmpty(),
    body("lastName").optional().trim().notEmpty(),
    body("profile.age").optional().isInt({ min: 13, max: 120 }),
    body("profile.weight").optional().isFloat({ min: 30, max: 300 }),
    body("profile.height").optional().isFloat({ min: 100, max: 250 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, profile } = req.body;
      const updateData = {};

      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (profile) updateData.profile = { ...req.user.profile, ...profile };

      const user = await User.findByIdAndUpdate(req.user._id, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      res.json({
        message: "Profile updated successfully",
        user: user.getPublicProfile(),
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Server error during profile update" });
    }
  }
);

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post(
  "/change-password",
  auth,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const isMatch = await req.user.comparePassword(currentPassword);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      // Update password
      req.user.password = newPassword;
      await req.user.save();

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Server error during password change" });
    }
  }
);

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post("/refresh", auth, async (req, res) => {
  try {
    const token = generateToken(req.user._id);
    res.json({
      message: "Token refreshed successfully",
      token,
      user: req.user.getPublicProfile(),
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ message: "Server error during token refresh" });
  }
});

module.exports = router;
