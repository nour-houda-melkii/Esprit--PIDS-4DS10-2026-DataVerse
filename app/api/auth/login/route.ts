import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"
import { connectDB } from "@/lib/mongodb"
import { User } from "@/lib/models/user.model"

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
)

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
    }

    await connectDB()

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
    }

    // Sign a JWT (expires in 7 days)
    const token = await new SignJWT({
      sub:   user._id.toString(),
      name:  user.name,
      email: user.email,
      role:  user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(SECRET)

    const response = NextResponse.json({
      user: {
        id:         user._id.toString(),
        name:       user.name,
        email:      user.email,
        role:       user.role,
        portfolios: user.portfolios,
      },
    })

    // Set HTTP-only cookie so middleware can read it
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 7, // 7 days
      path:     "/",
    })

    return response
  } catch (err) {
    console.error("[LOGIN ERROR]", err)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}