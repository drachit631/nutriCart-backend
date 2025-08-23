const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cron = require("node-cron");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const dietPlanRoutes = require("./routes/dietPlans");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const subscriptionRoutes = require("./routes/subscriptions");
const adminRoutes = require("./routes/admin");

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/diet-plans", dietPlanRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "NutriCart+ API is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Schedule subscription orders (runs daily at 6 AM)
cron.schedule("0 6 * * *", async () => {
  try {
    console.log("🕐 Running daily subscription check...");
    // This will be implemented in the subscription service
    // await processSubscriptions();
  } catch (error) {
    console.error("❌ Subscription processing error:", error);
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 NutriCart+ Backend running on port ${PORT}`);
  console.log(
    `📱 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`
  );
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});
