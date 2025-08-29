import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "./src/models/User.js";
import Product from "./src/models/Product.js";
import DietPlan from "./src/models/DietPlan.js";
import Cart from "./src/models/Cart.js";
import Order from "./src/models/Order.js";
import Recipe from "./src/models/Recipe.js";
import Partnership from "./src/models/Partnership.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    // origin: process.env.FRONTEND_URL || process.env.CORS_ORIGIN,
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB,
  });
  console.log("Connected to MongoDB");

  // Debug: List all databases to find where the user data actually is
  const admin = mongoose.connection.db.admin();
  const databases = await admin.listDatabases();
  console.log(
    "📊 Available databases:",
    databases.databases.map((db) => db.name)
  );

  // Check current database
  console.log(
    "🔗 Currently connected to database:",
    mongoose.connection.db.databaseName
  );
}

// Health
app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    service: "nutricart-backend",
    time: new Date().toISOString(),
  });
});

// Auth
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email } = req.body || {};
    const exists = await User.findOne({ email });
    if (exists)
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    const user = await User.create({ ...req.body, profileComplete: false });
    const { password, _id, ...safe } = user.toObject();
    const token = `mock-jwt-${user._id}-${Date.now()}`;
    const response = { user: { ...safe, id: user._id }, token };
    console.log("User registered:", {
      id: response.user.id,
      email: response.user.email,
    });
    res.status(201).json(response);
  } catch (e) {
    console.error("Registration error:", e);
    res.status(400).json({ message: e.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    console.log("🔐 Login attempt received:", {
      email: email || "missing",
      hasPassword: password,
    });

    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Use raw MongoDB query to avoid Mongoose validation issues during lookup
    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");
    // console.log("🔍 Users collection:", usersCollection);

    console.log("🔍 Database info:", {
      dbName: db.databaseName,
      collectionName: "users",
    });

    // Debug: List all users to see what's actually in the database
    const allUsers = await usersCollection.find().toArray();
    console.log("📋 All users in database:", allUsers);
    const user = await usersCollection.findOne({ email: email.toString() });
    console.log("🔍 User:", user);
    console.log("🔍 User lookup result:", {
      found: !!user,
      email: user?.email,
      hasPassword: !!user?.password,
    });

    if (!user) {
      console.log("❌ User not found for email:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.password !== password) {
      console.log("❌ Password mismatch for user:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✅ Password verified for user:", email);

    // Ensure subscription is in correct format
    if (
      !user.subscription ||
      typeof user.subscription === "string" ||
      !user.subscription.tier
    ) {
      console.log("Ensuring proper subscription format for user:", user.email);

      const tier = user.subscription.tier;
      const properSubscription = {
        tier: tier === "premium" ? "premium" : tier === "pro" ? "pro" : "free",
        isActive: true,
        features: {
          basicDietPlans: true,
          basicRecipes: true,
          progressTracking: tier === "premium" || tier === "pro",
          premiumDietPlans: tier === "premium" || tier === "pro",
          prioritySupport: tier === "premium" || tier === "pro",
          exclusiveRecipes: tier === "premium" || tier === "pro",
          nutritionalAnalysis: tier === "premium" || tier === "pro",
          advancedAnalytics: tier === "pro",
          restaurantRecommendations: tier === "pro",
          prioritySupport24x7: tier === "pro",
          exclusiveWorkshops: tier === "pro",
          proRecipes: tier === "pro",
          proDietPlans: tier === "pro",
          oneOnOneConsultation: tier === "pro",
        },
      };

      // Update using raw MongoDB to avoid validation
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            subscription: properSubscription,
            lastLogin: new Date().toISOString(),
          },
        }
      );

      // Update the user object for response
      user.subscription = properSubscription;
      user.lastLogin = new Date().toISOString();
    } else {
      // Update lastLogin only
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date().toISOString() } }
      );
      user.lastLogin = new Date().toISOString();
    }
    const { password: _pw, _id, ...safe } = user;
    const token = `mock-jwt-${user._id}-${Date.now()}`;
    const response = { user: { ...safe, id: user._id }, token };
    console.log("✅ User logged in successfully:", {
      id: response.user.id,
      email: response.user.email,
    });
    res.json(response);
  } catch (e) {
    console.error("Login error:", e);
    res.status(400).json({ message: e.message });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Fetching user with ID:", id, "Type:", typeof id);

    // Validate user ID
    if (!id || id === "undefined" || id === "null") {
      console.log("Invalid user ID received:", id);
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password, _id, ...safe } = user.toObject();
    const response = { ...safe, id: user._id };
    console.log("User found, returning:", {
      id: response.id,
      email: response.email,
    });
    res.json(response);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate user ID
    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { ...req.body, profileComplete: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password, _id, ...safe } = user.toObject();
    res.json({ ...safe, id: user._id });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Diet Plans
app.get("/api/diet-plans", async (_req, res) => {
  const plans = await DietPlan.find();
  res.json(plans);
});

app.get("/api/diet-plans/:id", async (req, res) => {
  try {
    const plan = await DietPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: "Diet plan not found" });
    res.json(plan);
  } catch (error) {
    console.error("Error fetching diet plan:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Products
app.get("/api/products", async (_req, res) => {
  try {
    const products = await Product.find();
    console.log("Products found:", products.length);
    console.log(
      "Sample product:",
      products[0]
        ? { _id: products[0]._id, name: products[0].name }
        : "No products"
    );
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get product by name (for recipe integration) - MUST come before /:id route
app.get("/api/products/search", async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: "Product name is required" });
    }

    const product = await Product.findOne({
      name: { $regex: name, $options: "i" },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      _id: product._id,
      name: product.name,
      price: product.price,
      category: product.category,
      inStock: product.inStock,
    });
  } catch (error) {
    console.error("Error searching product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/categories", async (_req, res) => {
  const products = await Product.find().select("category");
  const unique = [...new Set(products.map((p) => p.category))];
  res.json(
    unique.map((c) => ({
      id: c.toLowerCase(),
      name: c,
      icon: "🛒",
      description: `${c}`,
    }))
  );
});

// Recipes
app.get("/api/recipes", async (_req, res) => {
  const recipes = await Recipe.find();
  res.json(recipes);
});

app.get("/api/recipes/:id", async (req, res) => {
  console.log("Recipe endpoint called with ID:", req.params.id);
  console.log("ID type:", typeof req.params.id);
  console.log("ID length:", req.params.id.length);

  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      console.log("Recipe not found for ID:", req.params.id);
      return res.status(404).json({ message: "Recipe not found" });
    }
    console.log("Recipe found:", recipe.name);
    res.json(recipe);
  } catch (error) {
    console.error("Error finding recipe:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Partnerships
app.get("/api/partnerships", async (_req, res) => {
  const partnerships = await Partnership.find();
  res.json(partnerships);
});

app.get("/api/partnerships/:id", async (req, res) => {
  const partnership = await Partnership.findById(req.params.id);
  if (!partnership)
    return res.status(404).json({ message: "Partnership not found" });
  res.json(partnership);
});

// Cart
app.get("/api/users/:userId/cart", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || userId === "undefined" || userId === "null") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.json({ items: [], total: 0, subtotal: 0, count: 0 });
    }

    // Transform cart to match frontend expectations
    const transformedCart = {
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      total: cart.total,
      subtotal: cart.total,
      count: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    };

    res.json(transformedCart);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/users/:userId/cart/items", async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, quantity = 1 } = req.body || {};

    console.log("Adding to cart:", { userId, productId, quantity });

    // Validate user ID
    if (!userId || userId === "undefined" || userId === "null") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Validate product ID
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Find product by MongoDB _id
    let product = await Product.findById(productId);

    if (!product) {
      console.log("Product not found for ID:", productId);
      return res.status(404).json({ message: "Product not found" });
    }

    console.log("Product found:", {
      _id: product._id,
      name: product.name,
      price: product.price,
    });

    if (!product.inStock) {
      return res.status(400).json({ message: "Product is out of stock" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId, items: [], total: 0 });

    // Add item to cart manually since the model doesn't have addItem method
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId === productId
    );

    if (existingItemIndex !== -1) {
      // Update existing item quantity
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        productId: productId,
        quantity: quantity,
        price: product.price,
      });
    }

    // Calculate total
    cart.total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    await cart.save();

    console.log("Cart updated successfully:", {
      itemsCount: cart.items.length,
      total: cart.total,
    });

    // Transform cart to match frontend expectations
    const transformedCart = {
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      total: cart.total,
      subtotal: cart.total,
      count: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    };

    res.status(201).json(transformedCart);
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.patch("/api/users/:userId/cart/items/:productId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { quantity } = req.body || {};
    const { productId } = req.params;

    // Validate user ID
    if (!userId || userId === "undefined" || userId === "null") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    const idx = cart.items.findIndex(
      (i) => i.productId === req.params.productId
    );
    if (idx === -1)
      return res.status(404).json({ message: "Item not found in cart" });
    if (quantity <= 0) cart.items.splice(idx, 1);
    else {
      cart.items[idx].quantity = quantity;
    }

    // Recalculate total
    cart.total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    await cart.save();

    // Transform cart to match frontend expectations
    const transformedCart = {
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      total: cart.total,
      subtotal: cart.total,
      count: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    };

    res.json(transformedCart);
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/users/:userId/cart/items/:productId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || userId === "undefined" || userId === "null") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    const idx = cart.items.findIndex(
      (i) => i.productId === req.params.productId
    );
    if (idx !== -1) {
      cart.items.splice(idx, 1);
    }

    // Recalculate total
    cart.total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    await cart.save();

    // Transform cart to match frontend expectations
    const transformedCart = {
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      total: cart.total,
      subtotal: cart.total,
      count: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    };

    res.json(transformedCart);
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/users/:userId/cart", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || userId === "undefined" || userId === "null") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    await Cart.findOneAndUpdate(
      { userId },
      { items: [], total: 0 },
      { upsert: true }
    );
    res.status(204).end();
  } catch (error) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Orders
app.get("/api/users/:userId/orders", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || userId === "undefined" || userId === "null") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const orders = await Order.find({ userId }).sort({
      orderDate: -1,
    });

    console.log(`✅ Fetched ${orders.length} orders for user: ${userId}`);
    res.json(orders);
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/users/:userId/orders", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!userId || userId === "undefined" || userId === "null") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    // Create order with proper structure
    const orderData = {
      userId,
      items:
        req.body.items ||
        cart.items.map((item) => ({
          productId: item.productId,
          productName: item.productName || "Product",
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
      subtotal: req.body.subtotal || cart.total,
      tax: req.body.tax || 0,
      shipping: req.body.shipping || 0,
      total: req.body.total || cart.total,
      shippingAddress: req.body.shippingAddress || {},
      paymentMethod: req.body.paymentMethod || "card",
      paymentDetails: req.body.paymentDetails || {},
      orderDate: new Date(),
      status: "processing",
    };

    const order = await Order.create(orderData);

    // Clear cart after successful order creation
    cart.items = [];
    cart.total = 0;
    await cart.save();

    console.log("✅ Order created successfully:", order._id);
    res.status(201).json(order);
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update user profile
app.put("/api/auth/profile", async (req, res) => {
  try {
    const authToken = req.headers.authorization;
    if (!authToken) {
      return res
        .status(401)
        .json({ message: "No authorization token provided" });
    }

    // Extract user ID from token (simple extraction for demo)
    const tokenParts = authToken.replace("Bearer ", "").split("-");
    if (tokenParts.length < 2) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const userId = tokenParts[1]; // Extract user ID from token
    const profileData = req.body;

    console.log("Updating profile for user:", userId);
    console.log("Profile data:", profileData);

    // Use raw MongoDB to avoid validation issues
    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    const result = await usersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: profileData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get updated user data
    const updatedUser = await usersCollection.findOne({
      _id: new mongoose.Types.ObjectId(userId),
    });
    const { password, _id, ...safeUser } = updatedUser;

    console.log("✅ Profile updated successfully in database");
    res.json({ ...safeUser, id: updatedUser._id });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user by ID
app.get("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("Fetching user:", userId);

    // Use raw MongoDB to avoid validation issues
    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({
      _id: new mongoose.Types.ObjectId(userId),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, _id, ...safeUser } = user;
    res.json({ ...safeUser, id: user._id });
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update user profile
app.put("/api/auth/profile", async (req, res) => {
  try {
    const authToken = req.headers.authorization;
    if (!authToken) {
      return res
        .status(401)
        .json({ message: "No authorization token provided" });
    }

    const tokenParts = authToken.replace("Bearer ", "").split("-");
    if (tokenParts.length < 2) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const userId = tokenParts[1];
    const profileData = req.body;

    console.log("Updating profile for user:", userId);
    console.log("Profile data:", profileData);

    // Use raw MongoDB to avoid validation issues
    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    const result = await usersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: profileData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await usersCollection.findOne({
      _id: new mongoose.Types.ObjectId(userId),
    });
    const { password, _id, ...safeUser } = updatedUser;

    console.log("✅ Profile updated successfully in database");
    res.json({ ...safeUser, id: updatedUser._id });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Start diet plan for user
app.post("/api/diet-plans/:planId/start", async (req, res) => {
  try {
    const { planId } = req.params;
    const { userId, formData } = req.body;

    console.log("Starting diet plan:", planId, "for user:", userId);
    console.log("Form data:", formData);

    // Validate userId
    if (!userId || userId === "undefined" || userId === "null") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("Invalid ObjectId format:", userId);
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Use raw MongoDB to avoid validation issues
    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Update user with diet plan data
    const result = await usersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          "preferences.activeDietPlan": planId,
          "preferences.dietPlanStartDate": new Date().toISOString(),
          "preferences.dietPlanGoals": formData,
        },
      }
    );

    if (result.matchedCount === 0) {
      console.error("User not found with ID:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Diet plan started successfully");
    res.json({ success: true, message: "Diet plan started successfully" });
  } catch (error) {
    console.error("❌ Error starting diet plan:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update user subscription
app.put("/api/users/:userId/subscription", async (req, res) => {
  try {
    const { userId } = req.params;
    const { subscription } = req.body;

    console.log("Updating subscription for user:", userId);
    console.log("New subscription data:", subscription);

    // Use raw MongoDB to avoid validation issues
    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    const result = await usersCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: { subscription: subscription } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Subscription updated successfully in database");
    res.json({ success: true, message: "Subscription updated successfully" });
  } catch (error) {
    console.error("❌ Error updating subscription:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`NutriCart backend running on ${process.env.BACKEND_URL}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
