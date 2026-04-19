import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { REAL_PROJECTS } from "@/lib/projects";

export async function GET() {
  try {
    const jsonPath = path.join(process.cwd(), "data", "uploaded-projects.json");
    const raw = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, "utf-8") : "[]";
    const uploaded = JSON.parse(raw);
    return NextResponse.json([...REAL_PROJECTS, ...uploaded]);
  } catch {
    return NextResponse.json(REAL_PROJECTS);
  }
}
