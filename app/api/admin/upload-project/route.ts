import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

const DATA_PATH    = path.join(process.cwd(), "data", "uploaded-projects.json");
const PHOTOS_DIR   = path.join(process.cwd(), "public", "uploads", "projects");
const REPORTS_DIR  = path.join(process.cwd(), "reports");

function ensureDirs() {
  [PHOTOS_DIR, REPORTS_DIR, path.dirname(DATA_PATH)].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function slug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    ensureDirs();
    const form = await req.formData();

    // ── Metadata fields ──────────────────────────────────────────────────
    const address     = (form.get("address")     as string) ?? "";
    const suburb      = (form.get("suburb")      as string) ?? "";
    const state       = (form.get("state")       as string) ?? "VIC";
    const postcode    = (form.get("postcode")     as string) ?? "";
    const lat         = parseFloat((form.get("lat") as string) ?? "0");
    const lng         = parseFloat((form.get("lng") as string) ?? "0");
    const type        = (form.get("type")        as string) ?? "Multi-Unit";
    const description = (form.get("description") as string) ?? "";
    const landSize    = parseInt((form.get("landSize") as string) ?? "0") || undefined;
    const units       = parseInt((form.get("units")    as string) ?? "0") || undefined;
    const price       = parseInt((form.get("price")    as string) ?? "50") || 50;

    if (!address || !suburb || !postcode) {
      return NextResponse.json({ error: "Address, suburb and postcode are required." }, { status: 400 });
    }

    const id        = `upload-${Date.now()}`;
    const baseSlug  = slug(`${address}-${suburb}`);
    const timestamp = new Date().toISOString().slice(0, 10);

    // ── Front photo ──────────────────────────────────────────────────────
    let photoUrl: string | undefined;
    const photoFile = form.get("photo") as File | null;
    if (photoFile && photoFile.size > 0) {
      const ext      = path.extname(photoFile.name) || ".jpg";
      const filename = `${baseSlug}-photo${ext}`;
      const dest     = path.join(PHOTOS_DIR, filename);
      fs.writeFileSync(dest, Buffer.from(await photoFile.arrayBuffer()));
      photoUrl = `/uploads/projects/${filename}`;
    }

    // ── Attachments → zip ────────────────────────────────────────────────
    let reportFile: string | undefined;
    const attachments = form.getAll("attachments") as File[];
    const validAttachments = attachments.filter(f => f && f.size > 0);

    if (validAttachments.length > 0) {
      const zip = new JSZip();
      for (const file of validAttachments) {
        zip.file(file.name, await file.arrayBuffer());
      }
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      const zipName   = `${baseSlug}-${timestamp}.zip`;
      fs.writeFileSync(path.join(REPORTS_DIR, zipName), zipBuffer);
      reportFile = zipName;
    }

    // ── Save project metadata ────────────────────────────────────────────
    const existing: object[] = JSON.parse(
      fs.existsSync(DATA_PATH) ? fs.readFileSync(DATA_PATH, "utf-8") : "[]"
    );

    const project = {
      id,
      address,
      suburb,
      state,
      postcode,
      lat,
      lng,
      price,
      type,
      description,
      landSize,
      units,
      reportFile,
      reportDate: timestamp,
      photoUrl,
      isReal: !!reportFile,
    };

    existing.push(project);
    fs.writeFileSync(DATA_PATH, JSON.stringify(existing, null, 2));

    return NextResponse.json({ ok: true, project });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}

// Allow large file uploads
export const config = {
  api: { bodyParser: false },
};
