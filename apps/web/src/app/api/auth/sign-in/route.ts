import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { verifyPassword } from "@/lib/server/password";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Please enter your email and password." }, { status: 400 });
    }

    const user = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase()) as any;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ success: false, error: "That email and password don't match." }, { status: 401 });
    }

    const safeUser = { id: user.id, email: user.email, name: user.name, company: user.company, role: user.role };

    const response = NextResponse.json({ success: true, user: safeUser });
    response.cookies.set("fremwork_session", safeUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
