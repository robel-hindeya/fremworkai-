import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("fremwork_session")?.value;
    const db = getDb();

    let user: any = null;
    if (sessionId) {
      user = db.prepare("SELECT id, email, name, company, role FROM users WHERE id = ?").get(sessionId);
    }

    return NextResponse.json({ success: true, user: user || null });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Signed out" });
  response.cookies.delete("fremwork_session");
  return response;
}
