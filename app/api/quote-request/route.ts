import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder');
  try {
    const { address, name, email, phone, notes } = await req.json();

    if (!address || !name || !email) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Save to Supabase CRM
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
      );
      await supabase.from("inquiries").insert({ name, email, phone, address, notes });
    } catch { /* continue even if DB save fails */ }

    const teamEmail = process.env.TEAM_EMAIL ?? "hello@developmentfeaso.com.au";
    const resendApiKey = process.env.RESEND_API_KEY;

    // If Resend is not configured, still return success (log to console for now)
    if (!resendApiKey || resendApiKey === "YOUR_RESEND_API_KEY_HERE") {
      console.log("Quote request received (Resend not configured):", { name, email, phone, address, notes });
      return NextResponse.json({ ok: true });
    }

    // Notify team
    await resend.emails.send({
      from: "Development Feaso <noreply@developmentfeaso.com.au>",
      to: teamEmail,
      subject: `New Quote Request — ${address}`,
      html: `
        <h2>New Quote Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Notes:</strong> ${notes || "None"}</p>
      `,
    });

    // Acknowledge customer
    await resend.emails.send({
      from: "Development Feaso <noreply@developmentfeaso.com.au>",
      to: email,
      subject: "We've received your quote request",
      html: `
        <h2>Hi ${name},</h2>
        <p>Thanks for your interest! We've received your request for a feasibility quote on:</p>
        <p><strong>${address}</strong></p>
        <p>Our team will review the site and send you a personalised quote within 1–2 business days.</p>
        <br/>
        <p>The Development Feaso Team</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Quote request error:", err);
    return NextResponse.json({ error: "Failed to send request." }, { status: 500 });
  }
}
