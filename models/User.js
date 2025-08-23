const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    profile: {
      age: {
        type: Number,
        min: 13,
        max: 120,
      },
      weight: {
        type: Number,
        min: 30,
        max: 300,
      },
      height: {
        type: Number,
        min: 100,
        max: 250,
      },
      gender: {
        type: String,
        enum: ["male", "female", "other", "prefer-not-to-say"],
      },
      activityLevel: {
        type: String,
        enum: [
          "sedentary",
          "lightly-active",
          "moderately-active",
          "very-active",
          "extremely-active",
        ],
      },
      healthGoals: [
        {
          type: String,
          enum: [
            "weight-loss",
            "weight-gain",
            "muscle-building",
            "maintenance",
            "energy-boost",
            "heart-health",
            "diabetes-management",
          ],
        },
      ],
      dietaryRestrictions: [
        {
          type: String,
          enum: [
            "vegetarian",
            "vegan",
            "gluten-free",
            "dairy-free",
            "nut-free",
            "shellfish-free",
            "none",
          ],
        },
      ],
      allergies: [String],
      preferredCuisines: [String],
    },
    subscription: {
      plan: {
        type: String,
        enum: ["free", "pro", "premium"],
        default: "free",
      },
      startDate: Date,
      endDate: Date,
      autoRenew: {
        type: Boolean,
        default: false,
      },
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

module.exports = mongoose.model("User", userSchema);
