import { NextResponse } from "next/server"

import { connectDB } from "@/lib/mongodb"
import { User } from "@/lib/models/user.model"

export async function DELETE(
  req: Request
) {
  try {
    await connectDB()

    const body = await req.json()

    const { email } = body

    await User.findOneAndDelete({
      email,
    })

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