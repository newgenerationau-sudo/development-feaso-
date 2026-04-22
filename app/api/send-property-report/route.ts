import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

interface Score { score: number; detail: string }
interface Scores {
  school: Score; transport: Score; shopping: Score;
  lifestyle: Score; growth: Score; zoning: Score;
}

const SCORE_META = [
  { key: "school",    label: "School",    icon: "🎓" },
  { key: "transport", label: "Transport", icon: "🚆" },
  { key: "shopping",  label: "Shopping",  icon: "🛒" },
  { key: "lifestyle", label: "Lifestyle", icon: "🌳" },
  { key: "growth",    label: "Growth",    icon: "📈" },
  { key: "zoning",    label: "Zoning",    icon: "🏛️" },
];

function scoreLabel(n: number) {
  if (n >= 9) return "Excellent";
  if (n >= 7) return "Good";
  if (n >= 5) return "Average";
  return "Below Average";
}

function scoreColor(n: number) {
  if (n >= 9) return "#16a34a";
  if (n >= 7) return "#2563eb";
  if (n >= 5) return "#d97706";
  return "#dc2626";
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");

  try {
    const { name, email, address, lat, lng, scores, interests } = await req.json() as {
      name: string; email: string; address: string;
      lat: number; lng: number; scores: Scores;
      interests?: Record<string, boolean>;
    };

    if (!name || !email || !address || !scores) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x200&location=${lat},${lng}&key=${apiKey}`;
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x200&markers=color:0x007a6e%7C${lat},${lng}&key=${apiKey}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://developmentfeaso.com.au";

    const validScores = Object.values(scores).filter(s => !s.noData);
    const overall = validScores.length ? Math.round(validScores.reduce((s, v) => s + v.score, 0) / validScores.length) : 0;

    const interestLabels: Record<string, string> = {
      finance:     "💰 Finance tips to save interest",
      offmarket:   "🏠 Off-market property opportunities",
      corelogic:   "📊 CoreLogic property report",
      fullreport:  "📋 Full feasibility & development report",
      buyersagent: "🤝 Speak with a buyer's agent",
      investing:   "📈 Property investment strategies",
      buying6mo:   "🔑 Planning to buy within 6 months",
      selling:     "🏷️ Thinking about selling",
    };
    const selectedInterests = Object.entries(interests ?? {})
      .filter(([, v]) => v)
      .map(([k]) => interestLabels[k] ?? k);

    const interestsHtml = selectedInterests.length > 0 ? `
      <div style="background:#f0faf8;border-radius:8px;padding:16px;margin:16px 0">
        <p style="font-weight:700;color:#111;margin:0 0 8px">Customer Interests:</p>
        ${selectedInterests.map(i => `<p style="margin:4px 0;color:#374151;font-size:13px">✓ ${i}</p>`).join("")}
      </div>` : "";

    const scoreRows = SCORE_META.map(m => {
      const s = scores[m.key as keyof Scores];
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6">
            <span style="font-size:18px">${m.icon}</span>
            <strong style="margin-left:8px;color:#111">${m.label}</strong>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;text-align:center">
            <span style="font-size:20px;font-weight:800;color:#007a6e">${s.score}</span>
            <span style="color:#9ca3af;font-size:12px">/10</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6">
            <span style="color:${scoreColor(s.score)};font-weight:600;font-size:12px">${scoreLabel(s.score)}</span>
            <br/><span style="color:#6b7280;font-size:11px">${s.detail}</span>
          </td>
        </tr>`;
    }).join("");

    const apiConfigured = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "YOUR_RESEND_API_KEY_HERE";

    if (!apiConfigured) {
      console.log("Property report email (Resend not configured):", { name, email, address });
      return NextResponse.json({ ok: true });
    }

    const teamEmail = process.env.TEAM_EMAIL ?? "newgeneration.au@gmail.com";

    // Notify team of new lead
    await resend.emails.send({
      from: "Development Feaso <noreply@developmentfeaso.com.au>",
      to: teamEmail,
      subject: `New Property Report Lead — ${address}`,
      html: `
        <h2>New Property Report Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Overall Score:</strong> ${overall}/10</p>
        ${interestsHtml || "<p><em>No interests selected</em></p>"}
      `,
    });

    await resend.emails.send({
      from: "Development Feaso <noreply@developmentfeaso.com.au>",
      to: email,
      subject: `Your Free Property Report — ${address}`,
      html: `
      <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f7f7f7;padding:40px 20px;margin:0">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">
          <div style="background:#007a6e;padding:28px 32px">
            <h1 style="color:#fff;margin:0;font-size:20px">Development Feaso</h1>
            <p style="color:#a7f3d0;margin:4px 0 0;font-size:14px">Free Property Report</p>
          </div>
          <div style="padding:32px">
            <p style="color:#333;font-size:16px">Hi ${name},</p>
            <p style="color:#555">Here is your free property report for:</p>
            <p style="background:#f0faf8;border-left:4px solid #007a6e;padding:12px 16px;border-radius:6px;font-weight:700;color:#111">${address}</p>

            <div style="text-align:center;margin:24px 0">
              <div style="display:inline-block;width:72px;height:72px;border-radius:50%;background:#007a6e;color:#fff;font-size:28px;font-weight:900;line-height:72px">${overall}</div>
              <p style="color:#6b7280;font-size:13px;margin:8px 0 0">Overall Score out of 10</p>
            </div>

            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <thead>
                <tr style="background:#f9fafb">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Category</th>
                  <th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase">Score</th>
                  <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase">Detail</th>
                </tr>
              </thead>
              <tbody>${scoreRows}</tbody>
            </table>

            <img src="${streetViewUrl}" alt="Street View" style="width:100%;border-radius:8px;margin:16px 0" />
            <img src="${mapUrl}" alt="Map" style="width:100%;border-radius:8px;margin:0 0 24px" />

            ${interestsHtml}

            <div style="background:#007a6e;border-radius:10px;padding:24px;text-align:center">
              <h3 style="color:#fff;margin:0 0 8px">Want the full picture?</h3>
              <p style="color:#a7f3d0;font-size:14px;margin:0 0 16px">Get a professional feasibility report with zoning, development yield, comparable sales and PDF for just $50.</p>
              <a href="${baseUrl}/order" style="background:#fff;color:#007a6e;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block">Get Full Report — $50</a>
            </div>

            <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
            <p style="color:#9ca3af;font-size:12px;text-align:center">© ${new Date().getFullYear()} Development Feaso · <a href="${baseUrl}" style="color:#007a6e">developmentfeaso.com.au</a></p>
          </div>
        </div>
      </body></html>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Send report error:", err);
    return NextResponse.json({ error: "Failed to send report." }, { status: 500 });
  }
}
