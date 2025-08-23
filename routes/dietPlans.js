const express = require("express");
const { body, validationResult } = require("express-validator");
const DietPlan = require("../models/DietPlan");
const { auth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// Mock AI Diet Plan Generator
const generateDietPlan = (userProfile) => {
  const { age, weight, healthGoals, dietaryRestrictions, activityLevel } =
    userProfile;

  // Simple logic to suggest diet plans based on user profile
  let suggestedPlan = "mediterranean"; // default

  if (healthGoals?.includes("weight-loss")) {
    if (dietaryRestrictions?.includes("vegan")) {
      suggestedPlan = "vegan";
    } else if (dietaryRestrictions?.includes("gluten-free")) {
      suggestedPlan = "mediterranean";
    } else {
      suggestedPlan = "intermittent-fasting";
    }
  } else if (healthGoals?.includes("muscle-building")) {
    suggestedPlan = "high-protein";
  } else if (healthGoals?.includes("heart-health")) {
    suggestedPlan = "dash";
  } else if (dietaryRestrictions?.includes("vegan")) {
    suggestedPlan = "vegan";
  } else if (dietaryRestrictions?.includes("gluten-free")) {
    suggestedPlan = "mediterranean";
  }

  return suggestedPlan;
};

// @route   POST /api/diet-plans/generate
// @desc    Generate personalized diet plan using AI
// @access  Private
router.post(
  "/generate",
  auth,
  [body("profile").isObject()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { profile } = req.body;

      // Generate diet plan suggestion
      const suggestedPlanType = generateDietPlan(profile);

      // Get the suggested diet plan from database
      const dietPlan = await DietPlan.findOne({
        type: suggestedPlanType,
        isActive: true,
      }).populate("groceryList");

      if (!dietPlan) {
        return res.status(404).json({ message: "No suitable diet plan found" });
      }

      res.json({
        message: "Diet plan generated successfully",
        suggestedPlan: dietPlanType,
        dietPlan,
        reasoning: `Based on your profile: ${
          profile.healthGoals?.join(", ") || "general health"
        } goals, ${
          profile.dietaryRestrictions?.join(", ") || "no"
        } restrictions, and ${
          profile.activityLevel || "moderate"
        } activity level.`,
      });
    } catch (error) {
      console.error("Diet plan generation error:", error);
      res
        .status(500)
        .json({ message: "Server error during diet plan generation" });
    }
  }
);

// @route   GET /api/diet-plans
// @desc    Get all active diet plans
// @access  Public
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { type, difficulty, limit = 20, page = 1 } = req.query;

    const filter = { isActive: true };
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const dietPlans = await DietPlan.find(filter)
      .select("-weeklySchedule -groceryList")
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await DietPlan.countDocuments(filter);

    res.json({
      dietPlans,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: skip + dietPlans.length < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get diet plans error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/diet-plans/:id
// @desc    Get diet plan by ID
// @access  Public
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const dietPlan = await DietPlan.findById(req.params.id)
      .populate("groceryList")
      .populate("createdBy", "firstName lastName");

    if (!dietPlan || !dietPlan.isActive) {
      return res.status(404).json({ message: "Diet plan not found" });
    }

    res.json({ dietPlan });
  } catch (error) {
    console.error("Get diet plan error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Diet plan not found" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/diet-plans/type/:type
// @desc    Get diet plans by type
// @access  Public
router.get("/type/:type", optionalAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 10 } = req.query;

    const dietPlans = await DietPlan.find({
      type,
      isActive: true,
    })
      .select("-weeklySchedule -groceryList")
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({ dietPlans });
  } catch (error) {
    console.error("Get diet plans by type error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/diet-plans/:id/add-to-cart
// @desc    Add diet plan groceries to user's cart
// @access  Private
router.post("/:id/add-to-cart", auth, async (req, res) => {
  try {
    const dietPlan = await DietPlan.findById(req.params.id);

    if (!dietPlan || !dietPlan.isActive) {
      return res.status(404).json({ message: "Diet plan not found" });
    }

    // This would integrate with the cart service
    // For now, return the grocery list
    res.json({
      message: "Grocery items ready to add to cart",
      groceryList: dietPlan.groceryList,
      estimatedTotal: dietPlan.groceryList.reduce((total, category) => {
        return (
          total +
          category.items.reduce((catTotal, item) => {
            // Mock pricing - in real app, would fetch from products
            return catTotal + item.quantity * 5; // $5 per item estimate
          }, 0)
        );
      }, 0),
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/diet-plans/search/:query
// @desc    Search diet plans
// @access  Public
router.get("/search/:query", optionalAuth, async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;

    const dietPlans = await DietPlan.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
            { type: { $regex: query, $options: "i" } },
            { tags: { $in: [new RegExp(query, "i")] } },
          ],
        },
      ],
    })
      .select("-weeklySchedule -groceryList")
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({ dietPlans, query });
  } catch (error) {
    console.error("Search diet plans error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/diet-plans/featured
// @desc    Get featured diet plans
// @access  Public
router.get("/featured", optionalAuth, async (req, res) => {
  try {
    const featuredPlans = await DietPlan.find({
      isActive: true,
    })
      .select("-weeklySchedule -groceryList")
      .limit(6)
      .sort({ rating: -1, createdAt: -1 });

    res.json({ featuredPlans });
  } catch (error) {
    console.error("Get featured plans error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
