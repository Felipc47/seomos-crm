import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { isOrgAdmin } from "@/lib/permissions";
import { EcommerceClient } from "@/components/settings/ecommerce-client";
export const dynamic="force-dynamic";
export default async function EcommerceSettingsPage(){const s=await getSessionOrNull();if(!s)redirect("/login");if(!isOrgAdmin(s.role))redirect("/settings/profile");return <EcommerceClient/>;}
