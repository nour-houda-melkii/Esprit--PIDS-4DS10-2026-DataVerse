import mongoose, { Schema, model, models, Document } from "mongoose"

// ─── Portfolio ────────────────────────────────────────────────────────────────

export interface IPortfolio {
  name: string
  currencyPairs: string[]
  initialCapital: number
  currency: string          // base currency of the capital (e.g. USD)
  riskLevel: "low" | "medium" | "high"
  tradingStyle: "scalping" | "day-trading" | "swing" | "long-term"
  createdAt: Date
}

const PortfolioSchema = new Schema<IPortfolio>({
  name:           { type: String, required: true, trim: true },
  currencyPairs:  { type: [String], default: [] },
  initialCapital: { type: Number, required: true, min: 0 },
  currency:       { type: String, default: "USD" },
  riskLevel:      { type: String, enum: ["low", "medium", "high"], required: true },
  tradingStyle:   { type: String, enum: ["scalping", "day-trading", "swing", "long-term"], required: true },
  createdAt:      { type: Date, default: Date.now },
})

// ─── User ─────────────────────────────────────────────────────────────────────

export interface IUser extends Document {
  name: string
  email: string
  passwordHash: string
  role: "investor" | "trader"
  portfolios: IPortfolio[]
  createdAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ["investor", "trader"], required: true },
    portfolios:   { type: [PortfolioSchema], default: [] },
  },
  { timestamps: true }
)

// Prevent Mongoose OverwriteModelError in dev hot-reload
export const User = models.User ?? model<IUser>("User", UserSchema)