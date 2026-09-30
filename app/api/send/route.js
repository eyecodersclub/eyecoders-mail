import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-change-me"
);

export async function POST(request) {
  try {
    // Verify auth
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await jwtVerify(token, SECRET);
    } catch {
      return Response.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Get email data from request
    const body = await request.json();
    const { to, cc, subject, text, html } = body;

    // Validate
    if (!to || (Array.isArray(to) && to.length === 0)) {
      return Response.json(
        { error: "At least one 'to' recipient is required" },
        { status: 400 }
      );
    }

    if (!subject) {
      return Response.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    if (!text && !html) {
      return Response.json(
        { error: "Email body (text or html) is required" },
        { status: 400 }
      );
    }

    // Forward to Apps Script
    const appsScriptUrl = process.env.APPS_SCRIPT_URL;

    if (!appsScriptUrl || appsScriptUrl.includes("YOUR_DEPLOYMENT_ID")) {
      return Response.json(
        { error: "Apps Script URL not configured. Set APPS_SCRIPT_URL in your environment variables." },
        { status: 500 }
      );
    }

    const appsScriptResponse = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, cc, subject, text, html }),
      redirect: "follow",
    });

    const result = await appsScriptResponse.json();

    if (!result.success) {
      return Response.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Email sent successfully",
      recipients: result.recipients,
    });
  } catch (error) {
    console.error("Send email error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
