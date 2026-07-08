import { NextRequest, NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authed = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!authed) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const result = await r2.send(
    new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 200 })
  );

  const files = (result.Contents ?? [])
    .sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0))
    .slice(0, 50)
    .map((obj) => ({
      key: obj.Key!,
      name: obj.Key!.split("/").slice(1).join("/") || obj.Key!,
      size: obj.Size ?? 0,
      uploadedAt: obj.LastModified?.toISOString() ?? null,
    }));

  return NextResponse.json({ files });
}
