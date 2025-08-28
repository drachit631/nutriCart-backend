<<<<<<< HEAD
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
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/nutricart";
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || "nutricart",
  });
  console.log("Connected to MongoDB");
}

async function seedIfEmpty() {
  const dietCount = await DietPlan.countDocuments();
  if (dietCount === 0) {
    await DietPlan.insertMany([
      {
        name: "Keto",
        description: "High-fat, low-carb diet",
        benefits: ["Rapid weight loss"],
        difficulty: "Medium",
        duration: "2-4 weeks",
        color: "from-purple-500 to-pink-500",
        icon: "🥑",
        price: 0,
        features: [],
        sampleMeals: [],
        restrictions: [],
        suitableFor: ["Weight loss"],
      },
      {
        name: "Mediterranean",
        description: "Heart-healthy diet",
        benefits: ["Heart health"],
        difficulty: "Easy",
        duration: "Lifestyle",
        color: "from-blue-500 to-cyan-500",
        icon: "🫒",
        price: 0,
        features: [],
        sampleMeals: [],
        restrictions: [],
        suitableFor: ["Heart health"],
      },
    ]);
  }
  const prodCount = await Product.countDocuments();
  if (prodCount === 0) {
    await Product.insertMany([
      {
        name: "Organic Quinoa",
        description: "Protein and fiber rich",
        price: 299,
        originalPrice: 399,
        category: "Grains",
        dietCompatible: ["vegan", "vegetarian", "gluten-free", "keto", "paleo"],
        image: "🌾",
        inStock: true,
        stockQuantity: 50,
        unit: "500g",
        rating: 4.8,
        reviews: 124,
        supplier: "Fresh Valley Farms",
        tags: ["Organic"],
      },
      {
        name: "Fresh Salmon Fillet",
        description: "Omega-3 rich",
        price: 899,
        originalPrice: 1199,
        category: "Seafood",
        dietCompatible: ["keto", "paleo", "mediterranean", "dash"],
        image: "🐟",
        inStock: true,
        stockQuantity: 25,
        unit: "300g",
        rating: 4.9,
        reviews: 89,
        tags: ["Premium"],
        supplier: "Coastal Fish Market",
      },
    ]);
  }
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
    const user = await User.findOne({ email });
    if (!user || user.password !== password)
      return res.status(401).json({ message: "Invalid email or password" });
    user.lastLogin = new Date().toISOString();
    await user.save();
    const { password: _pw, _id, ...safe } = user.toObject();
    const token = `mock-jwt-${user._id}-${Date.now()}`;
    const response = { user: { ...safe, id: user._id }, token };
    console.log("User logged in:", {
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
    res.json(cart || { items: [], total: 0 });
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

    const idx = cart.items.findIndex((i) => i.productId === productId);
    if (idx !== -1) {
      cart.items[idx].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity, price: product.price });
    }

    cart.total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    await cart.save();

    console.log("Cart updated successfully:", {
      itemsCount: cart.items.length,
      total: cart.total,
    });

    res.status(201).json(cart);
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
    else cart.items[idx].quantity = quantity;
    cart.total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    await cart.save();
    res.json(cart);
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
    cart.items = cart.items.filter((i) => i.productId !== req.params.productId);
    cart.total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    await cart.save();
    res.status(204).end();
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
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
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
    const order = await Order.create({
      userId,
      items: cart.items,
      total: cart.total,
      ...req.body,
      orderDate: new Date().toISOString(),
    });
    cart.items = [];
    cart.total = 0;
    await cart.save();
    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

connectDB()
  .then(seedIfEmpty)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`NutriCart backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
=======
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
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/nutricart";
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || "nutricart",
  });
  console.log("Connected to MongoDB");
}

async function seedIfEmpty() {
  const dietCount = await DietPlan.countDocuments();
  if (dietCount === 0) {
    await DietPlan.insertMany([
      {
        name: "Keto",
        description: "High-fat, low-carb diet",
        benefits: ["Rapid weight loss"],
        difficulty: "Medium",
        duration: "2-4 weeks",
        color: "from-purple-500 to-pink-500",
        icon: "🥑",
        price: 0,
        features: [],
        sampleMeals: [],
        restrictions: [],
        suitableFor: ["Weight loss"],
      },
      {
        name: "Mediterranean",
        description: "Heart-healthy diet",
        benefits: ["Heart health"],
        difficulty: "Easy",
        duration: "Lifestyle",
        color: "from-blue-500 to-cyan-500",
        icon: "🫒",
        price: 0,
        features: [],
        sampleMeals: [],
        restrictions: [],
        suitableFor: ["Heart health"],
      },
    ]);
  }
  const prodCount = await Product.countDocuments();
  if (prodCount === 0) {
    await Product.insertMany([
      {
        name: "Organic Quinoa",
        description: "Protein and fiber rich",
        price: 299,
        originalPrice: 399,
        category: "Grains",
        dietCompatible: ["vegan", "vegetarian", "gluten-free", "keto", "paleo"],
        image: "🌾",
        inStock: true,
        stockQuantity: 50,
        unit: "500g",
        rating: 4.8,
        reviews: 124,
        supplier: "Fresh Valley Farms",
        tags: ["Organic"],
      },
      {
        name: "Fresh Salmon Fillet",
        description: "Omega-3 rich",
        price: 899,
        originalPrice: 1199,
        category: "Seafood",
        dietCompatible: ["keto", "paleo", "mediterranean", "dash"],
        image: "🐟",
        inStock: true,
        stockQuantity: 25,
        unit: "300g",
        rating: 4.9,
        reviews: 89,
        tags: ["Premium"],
        supplier: "Coastal Fish Market",
      },
    ]);
  }
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
    const user = await User.findOne({ email });
    if (!user || user.password !== password)
      return res.status(401).json({ message: "Invalid email or password" });
    user.lastLogin = new Date().toISOString();
    await user.save();
    const { password: _pw, _id, ...safe } = user.toObject();
    const token = `mock-jwt-${user._id}-${Date.now()}`;
    const response = { user: { ...safe, id: user._id }, token };
    console.log("User logged in:", {
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
    res.json(cart || { items: [], total: 0 });
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

    const idx = cart.items.findIndex((i) => i.productId === productId);
    if (idx !== -1) {
      cart.items[idx].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity, price: product.price });
    }

    cart.total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    await cart.save();

    console.log("Cart updated successfully:", {
      itemsCount: cart.items.length,
      total: cart.total,
    });

    res.status(201).json(cart);
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
    else cart.items[idx].quantity = quantity;
    cart.total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    await cart.save();
    res.json(cart);
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
    cart.items = cart.items.filter((i) => i.productId !== req.params.productId);
    cart.total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    await cart.save();
    res.status(204).end();
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
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
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
    const order = await Order.create({
      userId,
      items: cart.items,
      total: cart.total,
      ...req.body,
      orderDate: new Date().toISOString(),
    });
    cart.items = [];
    cart.total = 0;
    await cart.save();
    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

connectDB()
  .then(seedIfEmpty)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`NutriCart backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
>>>>>>> 4d79677cd42d0fba24c91ecc4dc32623f1ca4c0c
