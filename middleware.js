import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-me"
);

const protectedPaths = ["/dashboard"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    // Token expired or invalid
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("auth_token", "", { maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
