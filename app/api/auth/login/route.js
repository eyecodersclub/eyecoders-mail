import { SignJWT } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-me"
);

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    const validUser = process.env.ADMIN_USERNAME || "admin";
    const validPass = process.env.ADMIN_PASSWORD || "admin123";

    if (username !== validUser || password !== validPass) {
      return Response.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await new SignJWT({ username, role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(SECRET);

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400, // 24 hours
      path: "/",
    });

    return Response.json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
