import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function SmsPage() { redirect("/inbox?channel=sms"); }
