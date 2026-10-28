import { mockGuard } from "@/lib/dev-guard";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const blocked = mockGuard(); if (blocked) return blocked;
  const key = req.headers.get("api-key") ?? "";
  if (key === "sms-mock-invalid-key-0000") return Response.json({ message: key }, { status: 401 });
  if (key === "sms-mock-unavailable-0000") return Response.json({ message: key }, { status: 503 });
  if (key === "sms-mock-rate-limit-0000") return Response.json({ message: key }, { status: 429 });
  if (key === "sms-mock-malformed-0000") return new Response("unexpected", { headers: { "Content-Type": "text/plain" } });
  if (!key.startsWith("sms-mock-")) return new Response(null, { status: 401 });
  return Response.json({
    email: key === "sms-mock-second-account-2222" ? "second@example.test" : "admin@example.test",
    companyName: "SMS MOCK",
    plan: key.includes("unknown") ? [] : [{ type: "sms", credits: key.includes("zero") ? 0 : 25, creditsType: "sendLimit" }],
    marketingAutomation: { key: "mock-provider-secret-must-never-be-returned" },
  });
}
