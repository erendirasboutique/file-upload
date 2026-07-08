import { redirect } from "next/navigation";
import { PUBLIC_BASE } from "@/lib/r2";

export const dynamic = "force-dynamic";

export default function FileRedirect({ params }: { params: { key: string[] } }) {
  const key = params.key.map(decodeURIComponent).join("/");
  redirect(`${PUBLIC_BASE}/${key}`);
}
