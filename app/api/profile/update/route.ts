import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { User } from "@/lib/models/user.model"

export async function PUT(req: Request) {
  try {
    await connectDB()

    const body = await req.json()

    const { name, email } = body

    const updatedUser =
      await User.findOneAndUpdate(
        {
          email,
        },
        {
          name,
        },
        {
          new: true,
        }
      )

    if (!updatedUser) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json({
      success: true,

      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        portfolios:
          updatedUser.portfolios,
      },
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