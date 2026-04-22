import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file");

  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const safeFile = path.basename(file);
  if (!safeFile.endsWith(".pdf")) return NextResponse.json({ error: "Invalid file" }, { status: 400 });

  const filePath = path.join(process.cwd(), "reports", safeFile);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const fileBuffer = fs.readFileSync(filePath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFile}"`,
      "Content-Length": fileBuffer.length.toString(),
    },
  });
}
