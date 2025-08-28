# NutriCart Backend

A Node.js/Express backend API server for the NutriCart application, built with MongoDB and Mongoose.

## Features

- **Authentication**: User registration, login, and profile management
- **Products**: Product catalog with categories and diet compatibility
- **Diet Plans**: Comprehensive diet plan management
- **Cart System**: Shopping cart functionality
- **Orders**: Order processing and management
- **Recipes**: Recipe database with ingredients and instructions
- **Partnerships**: Local farmer and supplier partnerships
- **User Progress**: Diet progress tracking

## Tech Stack

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens (mock implementation)
- **CORS**: Cross-origin resource sharing enabled

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://127.0.0.1:27017/nutricart
MONGODB_DB=nutricart

# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# JWT Secret (for production, use a strong secret)
JWT_SECRET=your-super-secret-jwt-key-here
```

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. For production:
   ```bash
   npm start
   ```

## Database Seeding

To populate the database with initial data:

```bash
npm run seed
```

This will create:

- Demo users (demo@nutricart.com / demo123)
- Sample products (quinoa, salmon, avocados, etc.)
- Diet plans (keto, mediterranean, vegan)
- Sample recipes
- Local partnerships
- User progress data

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Users

- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/:id` - Update user profile

### Diet Plans

- `GET /api/diet-plans` - Get all diet plans
- `GET /api/diet-plans/:id` - Get specific diet plan

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get specific product
- `GET /api/categories` - Get product categories

### Recipes

- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/:id` - Get specific recipe

### Partnerships

- `GET /api/partnerships` - Get all partnerships
- `GET /api/partnerships/:id` - Get specific partnership

### Cart

- `GET /api/users/:userId/cart` - Get user cart
- `POST /api/users/:userId/cart/items` - Add item to cart
- `PATCH /api/users/:userId/cart/items/:productId` - Update cart item
- `DELETE /api/users/:userId/cart/items/:productId` - Remove item from cart
- `DELETE /api/users/:userId/cart` - Clear cart

### Orders

- `GET /api/users/:userId/orders` - Get user orders
- `POST /api/users/:userId/orders` - Create new order

### Health Check

- `GET /api/health` - Server health status

## Database Models

- **User**: User accounts with preferences and profile data
- **Product**: Product catalog with nutrition and diet info
- **DietPlan**: Diet plans with meal structures
- **Recipe**: Recipes with ingredients and instructions
- **Cart**: Shopping cart with items and totals
- **Order**: Order records with items and status
- **Partnership**: Local supplier partnerships
- **UserProgress**: User diet progress tracking

## Development

The server runs on port 4000 by default. The frontend should be configured to connect to `http://localhost:4000/api`.

## Production Notes

- Implement proper JWT authentication
- Add input validation and sanitization
- Implement rate limiting
- Add logging and monitoring
- Use environment-specific configurations
- Implement proper error handling middleware
