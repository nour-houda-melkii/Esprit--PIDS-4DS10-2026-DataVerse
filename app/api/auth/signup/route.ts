import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/mongodb"
import { User } from "@/lib/models/user.model"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, role, portfolios } = body

    // ── Validate required fields ──────────────────────────────────────────────
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      )
    }

    if (!["investor", "trader"].includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 })
    }

    if (!Array.isArray(portfolios) || portfolios.length === 0) {
      return NextResponse.json(
        { error: "At least one portfolio is required." },
        { status: 400 }
      )
    }

    // Investor is capped at 1 portfolio, trader at 5
    const maxPortfolios = role === "investor" ? 1 : 5
    if (portfolios.length > maxPortfolios) {
      return NextResponse.json(
        { error: `${role === "investor" ? "Investors" : "Traders"} can have at most ${maxPortfolios} portfolio(s).` },
        { status: 400 }
      )
    }

    // ── Connect to DB ─────────────────────────────────────────────────────────
    await connectDB()

    // ── Check duplicate email ─────────────────────────────────────────────────
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }

    // ── Hash password ─────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12)

    // ── Create user ───────────────────────────────────────────────────────────
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      portfolios,
    })

    // Return safe user object (no passwordHash)
    return NextResponse.json(
      {
        user: {
          id:         user._id.toString(),
          name:       user.name,
          email:      user.email,
          role:       user.role,
          portfolios: user.portfolios,
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error("[SIGNUP ERROR]", err)
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    )
  }
}