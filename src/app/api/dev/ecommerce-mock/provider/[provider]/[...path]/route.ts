import { mockGuard } from "@/lib/dev-guard";
import { commerceMockResponse } from "@/server/dev/ecommerce-mock";
export const dynamic="force-dynamic";
async function handler(req:Request,{params}:{params:Promise<{provider:string;path:string[]}>}){const guard=mockGuard();if(guard)return guard;const p=await params;return commerceMockResponse(p.provider,p.path.join("/").replace(/^wp-json\/wc\/v3\//,""),req.method,req.method==="POST"?(req.headers.get("content-type")?.includes("application/x-www-form-urlencoded")?Object.fromEntries(new URLSearchParams(await req.text())):await req.json().catch(()=>({}))): {},req.headers);}
export {handler as GET,handler as POST};
