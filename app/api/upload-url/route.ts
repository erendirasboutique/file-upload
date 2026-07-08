import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { r2, BUCKET } from "@/lib/r2";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

function sanitizeFilename(name: string): string {
  // Keep letters, numbers, dots, dashes; collapse everything else to a dash
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120) || "file";
}

export async function POST(req: NextRequest) {
  const authed = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!authed) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { filename, contentType, size } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
  }
  if (size && size > MAX_SIZE) {
    return NextResponse.json({ error: "File is larger than 100 MB" }, { status: 413 });
  }

  const id = nanoid(8);
  const key = `${id}/${sanitizeFilename(filename)}`;

  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 }
  );

  return NextResponse.json({ uploadUrl, key, viewPath: `/f/${key}` });
}
