import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
    apiVersion: "2026-03-25.dahlia",
  });
  const resend = new Resend(process.env.RESEND_API_KEY);
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") return NextResponse.json({ ok: true });

    const customerEmail = session.customer_email ?? session.metadata?.customer_email ?? "";
    const customerName  = session.metadata?.customer_name ?? "Customer";
    const baseUrl       = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    // Collect all purchased report files from line items metadata
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ["data.price.product"] });

    const reportLinks: string[] = [];

    // Cart purchase — files stored in session metadata as JSON
    if (session.metadata?.cart_files) {
      const files: string[] = JSON.parse(session.metadata.cart_files);
      files.forEach((file) => {
        const url = `${baseUrl}/api/download?session_id=${session.id}&file=${encodeURIComponent(file)}`;
        reportLinks.push(`<li style="margin:8px 0"><a href="${url}" style="color:#007a6e;font-weight:600">${file.replace(".pdf", "")}</a></li>`);
      });
    }

    // Single order (custom report — no file yet, notify team instead)
    if (reportLinks.length === 0 && session.metadata?.property_address) {
      const addr = session.metadata.property_address;
      // Notify team to produce the report
      await resend.emails.send({
        from: "Development Feaso <noreply@developmentfeaso.com.au>",
        to: process.env.TEAM_EMAIL ?? "hello@developmentfeaso.com.au",
        subject: `New Custom Report Order — ${addr}`,
        html: `<p>New feasibility report ordered for:</p><p><strong>${addr}</strong></p><p>Customer: ${customerName} &lt;${customerEmail}&gt;</p>`,
      });

      // Send acknowledgement to customer
      if (customerEmail) {
        await resend.emails.send({
          from: "Development Feaso <noreply@developmentfeaso.com.au>",
          to: customerEmail,
          subject: "We've received your feasibility report request",
          html: emailTemplate({
            name: customerName,
            intro: `Thank you for ordering a feasibility report for <strong>${addr}</strong>.`,
            body: "Our team will review your property and send your detailed report within <strong>2–5 business days</strong>.",
            links: "",
            baseUrl,
          }),
        });
      }
      return NextResponse.json({ ok: true });
    }

    // Send email with download links
    if (customerEmail && reportLinks.length > 0) {
      await resend.emails.send({
        from: "Development Feaso <noreply@developmentfeaso.com.au>",
        to: customerEmail,
        subject: "Your Feasibility Report is Ready to Download",
        html: emailTemplate({
          name: customerName,
          intro: "Thank you for your purchase! Your feasibility report(s) are ready to download.",
          body: "Click the links below to download your report(s). Links are tied to your payment session.",
          links: `<ul style="padding-left:20px">${reportLinks.join("")}</ul>`,
          baseUrl,
        }),
      });
    }
  }

  return NextResponse.json({ ok: true });
}

function emailTemplate({ name, intro, body, links, baseUrl }: {
  name: string; intro: string; body: string; links: string; baseUrl: string;
}) {
  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:Arial,sans-serif;background:#f7f7f7;padding:40px 20px;margin:0">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
      <div style="background:#007a6e;padding:28px 32px">
        <h1 style="color:#fff;margin:0;font-size:20px">Development Feaso</h1>
      </div>
      <div style="padding:32px">
        <p style="color:#333;font-size:16px">Hi ${name},</p>
        <p style="color:#444;line-height:1.6">${intro}</p>
        <p style="color:#444;line-height:1.6">${body}</p>
        ${links}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#888;font-size:13px">Questions? Reply to this email or contact us at hello@developmentfeaso.com.au</p>
        <p style="color:#888;font-size:12px">© ${new Date().getFullYear()} Development Feaso · <a href="${baseUrl}" style="color:#007a6e">developmentfeaso.com.au</a></p>
      </div>
    </div>
  </body>
  </html>`;
}
