import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
)

const PROTECTED  = ["/platform"]
const AUTH_ROUTES = ["/login", "/signup"]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get("auth-token")?.value

  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  const isAuthRoute  = AUTH_ROUTES.some(p => pathname.startsWith(p))

  let isValid = false
  if (token) {
    try {
      await jwtVerify(token, SECRET)
      isValid = true
    } catch {
      isValid = false
    }
  }

  // Not logged in → trying to access platform → redirect to login
  if (isProtected && !isValid) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  // Already logged in → trying to access login/signup → redirect to platform
  if (isAuthRoute && isValid) {
    const url = req.nextUrl.clone()
    url.pathname = "/platform/overview"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/platform/:path*",
    "/login",
    "/signup",
  ],
}