import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    // ── Cart checkout (multiple existing reports) ────────────────────────
    if (body.cartItems && Array.isArray(body.cartItems)) {
      const lineItems = body.cartItems.map((item: {
        project: { price: number; address: string; type: string; suburb: string };
        quantity: number;
      }) => ({
        price_data: {
          currency: "aud",
          unit_amount: item.project.price * 100,
          product_data: {
            name: `Feasibility Report — ${item.project.address}, ${item.project.suburb}`,
            description: item.project.type,
          },
        },
        quantity: item.quantity,
      }));

      // Collect report files for webhook email
      const cartFiles = body.cartItems
        .map((i: { project: { reportFile?: string } }) => i.project.reportFile)
        .filter(Boolean);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: lineItems,
        metadata: {
          cart_files: JSON.stringify(cartFiles),
        },
        success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/projects`,
      });

      return NextResponse.json({ url: session.url });
    }

    // ── Single report purchase (from project card) ────────────────────────
    if (body.projectId && body.reportFile) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: body.email || undefined,
        line_items: [{
          price_data: {
            currency: "aud",
            unit_amount: body.price * 100,
            product_data: {
              name: `Feasibility Report — ${body.address}`,
              description: "Property development feasibility report by ST Architects",
            },
          },
          quantity: 1,
        }],
        metadata: {
          cart_files: JSON.stringify([body.reportFile]),
          customer_name: body.name ?? "",
          customer_email: body.email ?? "",
          property_address: body.address,
        },
        success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}&file=${encodeURIComponent(body.reportFile)}`,
        cancel_url: `${baseUrl}/projects`,
      });

      return NextResponse.json({ url: session.url });
    }

    // ── Custom report order (new address, no existing PDF) ────────────────
    const { address, name, email, phone, notes } = body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [{
        price_data: {
          currency: "aud",
          unit_amount: 5000,
          product_data: {
            name: "Property Feasibility Report (Custom)",
            description: `Address: ${address}`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        customer_name: name,
        customer_email: email,
        customer_phone: phone ?? "",
        property_address: address,
        notes: notes ?? "",
      },
      success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/order`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 });
  }
}
