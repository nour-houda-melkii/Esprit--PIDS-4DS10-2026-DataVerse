import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

import { connectDB } from "@/lib/mongodb"
import { User } from "@/lib/models/user.model"

export async function PUT(req: Request) {
  try {
    await connectDB()

    const body = await req.json()

    const {
      email,
      currentPassword,
      newPassword,
    } = body

    // FIND USER

    const user = await User.findOne({
      email,
    })

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        }
      )
    }

    // CHECK CURRENT PASSWORD

    const valid =
      await bcrypt.compare(
        currentPassword,
        user.passwordHash
      )

    if (!valid) {
      return NextResponse.json(
        {
          error:
            "Current password incorrect",
        },
        {
          status: 401,
        }
      )
    }

    // HASH NEW PASSWORD

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        12
      )

    // UPDATE PASSWORD

    user.passwordHash =
      hashedPassword

    await user.save()

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      }
    )
  }
}