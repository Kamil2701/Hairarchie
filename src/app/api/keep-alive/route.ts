import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

// Supabase's free plan pauses a project after about a week without
// activity. Vercel calls this route once a day (see vercel.json) and it
// runs one tiny query, which counts as activity and keeps the database awake.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(`Bearer ${expected ?? ""}`);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ ok: true, database: "not configured" });
  }

  const { error } = await admin.from("customers").select("id", { head: true, count: "exact" }).limit(1);
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
