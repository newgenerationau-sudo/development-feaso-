import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import path from "path";
import fs from "fs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const file = searchParams.get("file");

  if (!sessionId || !file) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Verify payment with Stripe
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 403 });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 403 });
  }

  // Security: prevent path traversal, only allow .pdf files
  const safeFile = path.basename(file);
  if (!safeFile.endsWith(".pdf")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "reports", safeFile);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFile}"`,
      "Content-Length": fileBuffer.length.toString(),
    },
  });
}
