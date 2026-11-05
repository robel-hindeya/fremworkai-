import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, company } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Please enter your email and password." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDb();

    if (db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail)) {
      return NextResponse.json({ success: false, error: "An account with that email already exists. Sign in instead." }, { status: 409 });
    }

    const id = `usr-${Date.now().toString(36)}`;
    const safeUser = { id, email: cleanEmail, name: name || cleanEmail.split("@")[0], company: company || "", role: "Owner" };

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, company, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, cleanEmail, hashPassword(password), safeUser.name, safeUser.company, safeUser.role, new Date().toISOString());

    const response = NextResponse.json({ success: true, user: safeUser }, { status: 201 });
    response.cookies.set("fremwork_session", id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
