// Minimal in-memory database and helpers (mirrors frontend structure)
export const database = {
  users: [
    {
      id: "1",
      firstName: "Demo",
      lastName: "User",
      email: "demo@nutricart.com",
      password: "demo123",
      profileComplete: true,
      createdAt: "2024-01-15T10:00:00Z",
      lastLogin: "2024-01-20T15:30:00Z",
      subscription: "premium",
      preferences: {
        dietaryRestrictions: ["Lactose Intolerant"],
        allergies: ["Peanuts"],
        budget: 8000,
        healthGoals: ["Weight Loss", "Muscle Gain"],
        preferredDiets: ["Keto", "Mediterranean"],
      },
    },
  ],
  dietPlans: [
    {
      id: "keto",
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
      id: "mediterranean",
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
  ],
  products: [
    {
      id: "1",
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
      id: "2",
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
      supplier: "Coastal Fish Market",
      tags: ["Premium"],
    },
  ],
  categories: [
    {
      id: "grains",
      name: "Grains",
      icon: "🌾",
      description: "Whole grains and cereals",
    },
    {
      id: "seafood",
      name: "Seafood",
      icon: "🐟",
      description: "Fresh fish and seafood",
    },
  ],
  recipes: [],
  orders: [],
  carts: [],
  subscriptions: [],
  userProgress: [],
  partnerships: [],
};

export const dbHelpers = {
  // users
  findUserByEmail: (email) => database.users.find((u) => u.email === email),
  findUserById: (id) => database.users.find((u) => u.id === id),
  createUser: (data) => {
    const newUser = {
      id: (database.users.length + 1).toString(),
      profileComplete: false,
      subscription: "free",
      preferences: {},
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      ...data,
    };
    database.users.push(newUser);
    return newUser;
  },
  updateUser: (id, updates) => {
    const idx = database.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    database.users[idx] = { ...database.users[idx], ...updates };
    return database.users[idx];
  },
  // diet plans
  getAllDietPlans: () => database.dietPlans,
  getDietPlanById: (id) => database.dietPlans.find((p) => p.id === id),
  getDietPlansByTags: (tags) =>
    database.dietPlans.filter((p) =>
      tags.some((t) => (p.suitableFor || []).includes(t))
    ),
  // products
  getAllProducts: () => database.products,
  getProductById: (id) => database.products.find((p) => p.id === id),
  getProductsByCategory: (category) =>
    database.products.filter((p) => p.category === category),
  getProductsByDiet: (diet) =>
    database.products.filter((p) => (p.dietCompatible || []).includes(diet)),
  searchProducts: (q) =>
    database.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.description.toLowerCase().includes(q.toLowerCase())
    ),
  // recipes
  getAllRecipes: () => database.recipes,
  getRecipeById: (id) => database.recipes.find((r) => r.id === id),
  getRecipesByDiet: (diet) =>
    database.recipes.filter((r) => (r.dietCompatible || []).includes(diet)),
  // cart
  getUserCart: (userId) => database.carts.find((c) => c.userId === userId),
  updateCart: (userId, items) => {
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const idx = database.carts.findIndex((c) => c.userId === userId);
    if (idx !== -1)
      database.carts[idx] = {
        ...database.carts[idx],
        items,
        total,
        updatedAt: new Date().toISOString(),
      };
    else
      database.carts.push({
        id: (database.carts.length + 1).toString(),
        userId,
        items,
        total,
        updatedAt: new Date().toISOString(),
      });
    return database.carts.find((c) => c.userId === userId);
  },
  // orders
  createOrder: (data) => {
    const order = {
      id: (database.orders.length + 1).toString(),
      orderDate: new Date().toISOString(),
      ...data,
    };
    database.orders.push(order);
    return order;
  },
  getUserOrders: (userId) => database.orders.filter((o) => o.userId === userId),
  // partnerships
  getAllPartnerships: () => database.partnerships,
  getPartnershipById: (id) => database.partnerships.find((p) => p.id === id),
};

export default database;
